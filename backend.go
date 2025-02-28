package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"go-card-creation/logger"
	"golang.org/x/sys/windows/registry"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

type Backend struct {
	ctx                       context.Context
	server                    *http.Server
	dataDir                   string
	uploadsDir                string
	port                      int
	running                   bool
	settingsHandlerRegistered bool
	updateHandlerRegistered   bool
	autoUpdateEnabled         bool
	updateChecked             bool
}

type Scene struct {
	ID    interface{} `json:"id"`
	Name  string      `json:"name"`
	Cards []Card      `json:"cards"`
}

type Card struct {
	ID               string        `json:"id"`
	Title            string        `json:"title"`
	Content          string        `json:"content"`
	Height           string        `json:"height"`
	Tags             []interface{} `json:"tags"`
	InsertedContents []interface{} `json:"insertedContents"`
}

type Prompt struct {
	ID               interface{}       `json:"id"`
	Title            string            `json:"title"`
	SystemPrompt     string            `json:"systemPrompt"`
	UserPrompt       string            `json:"userPrompt"`
	DefaultModel     string            `json:"defaultModel"`
	InsertedContents []InsertedContent `json:"insertedContents"`
	SelectedModel    interface{}       `json:"selectedModel"`
	DetectKeywords   bool              `json:"detectKeywords"`
}

type InsertedContent struct {
	ID      interface{} `json:"id"`
	Content string      `json:"content"`
	CardID  string      `json:"cardId"`
}

type Tag struct {
	ID   interface{} `json:"id"`
	Name string      `json:"name"`
}

type Agent struct {
	ID        interface{} `json:"id"`
	Name      string      `json:"name"`
	CreatedAt string      `json:"createdAt"`
	UpdatedAt string      `json:"updatedAt"`
}

type Model struct {
	ID               interface{} `json:"id"`
	Name             string      `json:"name"`
	ApiUrl           string      `json:"apiUrl"`
	ModelID          string      `json:"modelId"`
	ApiKey           string      `json:"apiKey"`
	MaxTokens        int         `json:"maxTokens"`
	Temperature      float64     `json:"temperature"`
	TopP             float64     `json:"topP,omitempty"`
	TopK             int         `json:"topK,omitempty"`
	FrequencyPenalty float64     `json:"frequencyPenalty,omitempty"`
	Provider         string      `json:"provider"`
	AvailableModels  []Model     `json:"availableModels,omitempty"`
}

type Config struct {
	Models         []Model       `json:"models"`
	NotepadContent string        `json:"notepadContent"`
	CurrentSceneID interface{}   `json:"currentSceneId"`
	SelectedTags   []interface{} `json:"selectedTags"`
	CurrentView    string        `json:"currentView"`
}

type Chapter struct {
	Title         string `json:"title"`
	Content       string `json:"content"`
	ChapterNumber int    `json:"chapterNumber"`
}

type Route struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Description string `json:"description"`
}

const maxUploadSize = 50 * 1024 * 1024 // 50MB

// NewBackend 创建新的后端服务
func NewBackend() *Backend {
	// 获取应用数据目录
	appDataDir, err := os.UserConfigDir()
	if err != nil {
		appDataDir = "."
	}
	dataDir := filepath.Join(appDataDir, "星卡写作", "data")
	uploadsDir := filepath.Join(appDataDir, "星卡写作", "uploads")

	// 确保目录存在
	os.MkdirAll(dataDir, 0755)
	os.MkdirAll(uploadsDir, 0755)

	b := &Backend{
		dataDir:       dataDir,
		uploadsDir:    uploadsDir,
		port:          3000,
		running:       false,
		updateChecked: false,
	}

	// 检查自动更新设置
	b.checkAutoUpdateSetting()
	return b
}

// 检查自动更新设置
func (b *Backend) checkAutoUpdateSetting() {
	// 从注册表获取安装路径
	key, err := registry.OpenKey(
		registry.CURRENT_USER,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe`,
		registry.QUERY_VALUE,
	)
	if err != nil {
		return
	}
	defer key.Close()

	// 获取安装路径
	exePath, _, err := key.GetStringValue("")
	if err != nil {
		return
	}

	// 检查自动更新设置文件
	autoUpdateFile := filepath.Join(filepath.Dir(exePath), "autoupdate.txt")
	content, err := ioutil.ReadFile(autoUpdateFile)
	if err == nil && strings.TrimSpace(string(content)) == "true" {
		b.autoUpdateEnabled = true
	}
}

// 执行自动更新
func (b *Backend) performAutoUpdate(currentVersion, latestVersion string) {
	if !b.autoUpdateEnabled {
		return
	}

	// 检查是否需要更新
	if currentVersion == latestVersion {
		return
	}

	// 构建下载URL
	downloadURL := fmt.Sprintf("https://bgithub.xyz/XingQiPan/card-creation/releases/download/v%s/v%s.exe", latestVersion, latestVersion)

	// 获取安装路径
	key, err := registry.OpenKey(
		registry.CURRENT_USER,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe`,
		registry.QUERY_VALUE,
	)
	if err != nil {
		return
	}
	defer key.Close()

	exePath, _, err := key.GetStringValue("")
	if err != nil {
		return
	}

	// 获取auto_update.bat的路径
	updateBatPath := filepath.Join(filepath.Dir(exePath), "auto_update.bat")

	// 启动更新脚本
	cmd := exec.Command(updateBatPath, downloadURL)
	cmd.Start()
}

// 启动服务器
func (b *Backend) StartServer(ctx context.Context, updater *Updater) string {
	if b.running {
		return fmt.Sprintf("服务器已在端口 %d 上运行", b.port)
	}

	b.ctx = ctx
	b.initializeDataFiles()

	mux := http.NewServeMux()

	// 注册API路由
	mux.HandleFunc("/health", b.healthHandler)
	mux.HandleFunc("/api/debug/config", b.debugConfigHandler)
	mux.HandleFunc("/api/load-scenes", b.loadScenesHandler)
	mux.HandleFunc("/api/load-prompts", b.loadPromptsHandler)
	mux.HandleFunc("/api/load-tags", b.loadTagsHandler)
	mux.HandleFunc("/api/load-config", b.loadConfigHandler)
	mux.HandleFunc("/api/save-scenes", b.saveScenesHandler)
	mux.HandleFunc("/api/save-prompts", b.savePromptsHandler)
	mux.HandleFunc("/api/save-tags", b.saveTagsHandler)
	mux.HandleFunc("/api/save-config", b.saveConfigHandler)
	mux.HandleFunc("/api/split-book", b.splitBookHandler)
	mux.HandleFunc("/api/sync-data", b.syncDataHandler)
	mux.HandleFunc("/api/get-all-data", b.getAllDataHandler)
	mux.HandleFunc("/api/agents", b.agentsHandler)
	mux.HandleFunc("/api/models", b.modelsHandler)
	mux.HandleFunc("/api/docs", b.apiDocsHandler)

	// 添加更新处理器
	if updater != nil {
		b.AddUpdateHandler(updater)
	}

	// 添加设置菜单
	b.AddSettingsHandler()

	mux.HandleFunc("/api/test", errorMiddleware(b.testHandler))

	// 检查自动更新（仅在程序启动时检查一次）
	if b.autoUpdateEnabled && !b.updateChecked {
		b.updateChecked = true // 标记已检查更新

		// 获取最新版本并检查是否需要更新
		latestVersion, _ := getBackendVersion()
		if latestVersion != "" && latestVersion != updater.currentVersion {
			b.performAutoUpdate(updater.currentVersion, latestVersion)
		}
	}

	// 启动HTTP服务器
	b.server = &http.Server{
		Addr:    fmt.Sprintf(":%d", b.port),
		Handler: corsMiddleware(mux),
	}

	go func() {
		if err := b.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP服务器错误: %v", err)
		}
	}()

	b.running = true
	log.Printf("服务器已在端口 %d 上启动", b.port)
	log.Printf("数据目录: %s", b.dataDir)
	return fmt.Sprintf("服务器已在端口 %d 上启动", b.port)
}

// 停止服务器
func (b *Backend) StopServer() string {
	if !b.running {
		return "服务器未运行"
	}

	if err := b.server.Shutdown(b.ctx); err != nil {
		return fmt.Sprintf("关闭服务器错误: %v", err)
	}

	b.running = false
	return "服务器已关闭"
}

// CORS中间件
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// 添加错误处理中间件
func errorMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				logger.LogError(err)
				http.Error(w, "内部服务器错误", http.StatusInternalServerError)
			}
		}()
		next(w, r)
	}
}

// 初始化数据文件
func (b *Backend) initializeDataFiles() {
	// 确保所有数据文件存在
	files := map[string]interface{}{
		filepath.Join(b.dataDir, "scenes.json"):  []interface{}{},
		filepath.Join(b.dataDir, "prompts.json"): []interface{}{},
		filepath.Join(b.dataDir, "tags.json"):    []interface{}{},
		filepath.Join(b.dataDir, "agents.json"):  []interface{}{},
		filepath.Join(b.dataDir, "config.json"): map[string]interface{}{
			"models":         []interface{}{},
			"notepadContent": "",
			"currentSceneId": nil,
			"selectedTags":   []interface{}{},
			"currentView":    "main",
		},
	}

	// 只为不存在的文件创建默认数据
	for file, defaultData := range files {
		if _, err := os.Stat(file); os.IsNotExist(err) {
			log.Printf("创建默认数据文件: %s", file)
			b.saveData(file, defaultData)
		}
	}

	// 确保配置文件包含必要的字段
	b.ensureConfigFile()
}

// 确保配置文件包含必要的字段
func (b *Backend) ensureConfigFile() {
	configFile := filepath.Join(b.dataDir, "config.json")
	var existingConfig map[string]interface{}

	// 添加日志
	log.Printf("检查配置文件: %s", configFile)

	// 读取现有配置
	if b.loadData(configFile, &existingConfig) {
		log.Printf("成功加载现有配置: %+v", existingConfig)

		// 检查并添加缺失的必要字段
		modified := false

		// 检查必要字段
		necessaryFields := map[string]interface{}{
			"models":         []interface{}{},
			"notepadContent": "",
			"currentSceneId": nil,
			"selectedTags":   []interface{}{},
			"currentView":    "main",
		}

		for field, defaultValue := range necessaryFields {
			if _, exists := existingConfig[field]; !exists {
				log.Printf("发现缺失字段: %s，添加默认值", field)
				existingConfig[field] = defaultValue
				modified = true
			}
		}

		// 如果有修改，保存更新后的配置
		if modified {
			log.Printf("配置文件已修改，准备保存更新")
			b.saveData(configFile, existingConfig)
		} else {
			log.Printf("配置文件包含所有必要字段，无需更新")
		}
	} else {
		log.Printf("无法加载配置文件或文件不存在")
	}
}

// 保存数据到文件
func (b *Backend) saveData(filePath string, data interface{}) bool {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Printf("序列化数据错误: %v", err)
		return false
	}

	err = ioutil.WriteFile(filePath, jsonData, 0644)
	if err != nil {
		log.Printf("写入文件错误 %s: %v", filePath, err)
		return false
	}

	return true
}

// 从文件加载数据
func (b *Backend) loadData(filePath string, v interface{}) bool {
	// 添加日志
	log.Printf("尝试加载文件: %s", filePath)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		log.Printf("文件不存在: %s", filePath)
		return false
	}

	data, err := ioutil.ReadFile(filePath)
	if err != nil {
		log.Printf("读取文件错误 %s: %v", filePath, err)
		return false
	}

	err = json.Unmarshal(data, v)
	if err != nil {
		log.Printf("解析JSON错误 %s: %v", filePath, err)
		return false
	}

	log.Printf("成功加载文件: %s", filePath)
	return true
}

// 健康检查处理器
func (b *Backend) healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// 测试处理器
func (b *Backend) testHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "API服务器正常工作",
	})
}

// 调试配置处理器
func (b *Backend) debugConfigHandler(w http.ResponseWriter, r *http.Request) {
	var config map[string]interface{}
	configFile := filepath.Join(b.dataDir, "config.json")

	if !b.loadData(configFile, &config) {
		http.Error(w, "读取配置失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    config,
	})
}

// 加载场景处理器
func (b *Backend) loadScenesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendErrorResponse(w, r, errors.New("方法不允许"), http.StatusMethodNotAllowed)
		return
	}

	var scenes []Scene
	scenesFile := filepath.Join(b.dataDir, "scenes.json")
	if !b.loadData(scenesFile, &scenes) {
		logger.LogFileError("读取", scenesFile, errors.New("加载场景失败"))
		scenes = []Scene{}
	}

	sendSuccessResponse(w, scenes)
}

// 加载提示处理器
func (b *Backend) loadPromptsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var prompts []Prompt
	promptsFile := filepath.Join(b.dataDir, "prompts.json")
	if !b.loadData(promptsFile, &prompts) {
		prompts = []Prompt{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    prompts,
	})
}

// 加载标签处理器
func (b *Backend) loadTagsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var tags []Tag
	tagsFile := filepath.Join(b.dataDir, "tags.json")
	if !b.loadData(tagsFile, &tags) {
		tags = []Tag{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    tags,
	})
}

// 加载配置处理器
func (b *Backend) loadConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var config Config
	configFile := filepath.Join(b.dataDir, "config.json")

	// 添加日志来追踪加载过程
	log.Printf("正在加载配置文件: %s", configFile)

	if !b.loadData(configFile, &config) {
		// 如果加载失败，使用默认配置
		log.Printf("加载配置失败，使用默认配置")
		config = Config{
			Models:         []Model{},
			NotepadContent: "",
			CurrentSceneID: nil,
			SelectedTags:   []interface{}{},
			CurrentView:    "main",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    config,
	})
}

// 保存场景处理器
func (b *Backend) saveScenesHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var scenes []Scene
	if err := json.NewDecoder(r.Body).Decode(&scenes); err != nil {
		http.Error(w, "无效的JSON数据", http.StatusBadRequest)
		return
	}

	scenesFile := filepath.Join(b.dataDir, "scenes.json")
	if !b.saveData(scenesFile, scenes) {
		http.Error(w, "保存场景失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// 保存提示处理器
func (b *Backend) savePromptsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var prompts []Prompt
	if err := json.NewDecoder(r.Body).Decode(&prompts); err != nil {
		http.Error(w, "无效的JSON数据", http.StatusBadRequest)
		return
	}

	promptsFile := filepath.Join(b.dataDir, "prompts.json")
	if !b.saveData(promptsFile, prompts) {
		http.Error(w, "保存提示失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// 保存标签处理器
func (b *Backend) saveTagsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var tags []Tag
	if err := json.NewDecoder(r.Body).Decode(&tags); err != nil {
		http.Error(w, "无效的JSON数据", http.StatusBadRequest)
		return
	}

	tagsFile := filepath.Join(b.dataDir, "tags.json")
	if !b.saveData(tagsFile, tags) {
		http.Error(w, "保存标签失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// 保存配置处理器
func (b *Backend) saveConfigHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	// 添加日志来追踪保存请求
	log.Printf("收到保存配置请求")

	var config Config
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "无效的JSON数据", http.StatusBadRequest)
		return
	}

	// 添加日志记录保存的内容
	log.Printf("准备保存配置: %+v", config)

	configFile := filepath.Join(b.dataDir, "config.json")
	if !b.saveData(configFile, config) {
		http.Error(w, "保存配置失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// 分割书籍处理器
func (b *Backend) splitBookHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		sendErrorResponse(w, r, fmt.Errorf("文件太大: %v", err), http.StatusBadRequest)
		return
	}

	// 获取场景ID
	sceneId := r.FormValue("sceneId")
	if sceneId == "" {
		sendErrorResponse(w, r, errors.New("缺少场景ID"), http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		sendErrorResponse(w, r, fmt.Errorf("获取文件失败: %v", err), http.StatusBadRequest)
		return
	}
	defer file.Close()

	log.Printf("接收到文件: %s, 大小: %d", header.Filename, header.Size)

	// 创建临时文件
	tempFile, err := ioutil.TempFile(b.uploadsDir, "upload-*")
	if err != nil {
		logger.LogFileError("创建临时文件", b.uploadsDir, err)
		sendErrorResponse(w, r, fmt.Errorf("创建临时文件失败: %v", err), http.StatusInternalServerError)
		return
	}
	defer os.Remove(tempFile.Name()) // 确保清理临时文件
	defer tempFile.Close()

	// 将上传的文件内容复制到临时文件
	fileBytes, err := ioutil.ReadAll(file)
	if err != nil {
		http.Error(w, "读取文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err := tempFile.Write(fileBytes); err != nil {
		http.Error(w, "写入临时文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 重置文件指针
	if _, err := tempFile.Seek(0, 0); err != nil {
		http.Error(w, "重置文件指针失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 读取文件内容
	content, err := ioutil.ReadAll(tempFile)
	if err != nil {
		http.Error(w, "读取文件内容失败: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// 分割章节
	chapters := b.splitIntoChapters(string(content))

	// 返回处理结果
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":  true,
		"sceneId":  sceneId,
		"chapters": chapters,
	})
}

// 分割章节函数
func (b *Backend) splitIntoChapters(text string) []Chapter {
	chapters := []Chapter{}
	lines := strings.Split(text, "\n")
	currentChapter := struct {
		Title   string
		Content []string
	}{
		Title:   "",
		Content: []string{},
	}

	// 章节匹配模式
	chapterPatterns := []*regexp.Regexp{
		regexp.MustCompile(`^第[一二三四五六七八九十百千]+[章节]`),
		regexp.MustCompile(`^第\d+[章节]`),
		regexp.MustCompile(`^[一二三四五六七八九十][、.．]`),
		regexp.MustCompile(`^[（(]\d+[)）]`),
		regexp.MustCompile(`^[【［][^】］]+[】］]`),
		regexp.MustCompile(`^#+\s+`),
	}

	isChapterTitle := func(line string) bool {
		trimmedLine := strings.TrimSpace(line)
		if len(trimmedLine) > 100 {
			return false
		}
		for _, pattern := range chapterPatterns {
			if pattern.MatchString(trimmedLine) {
				return true
			}
		}
		return false
	}

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		if isChapterTitle(line) {
			if currentChapter.Title != "" && len(currentChapter.Content) > 0 {
				chapters = append(chapters, Chapter{
					Title:   currentChapter.Title,
					Content: strings.Join(currentChapter.Content, "\n"),
				})
			}
			currentChapter.Title = line
			currentChapter.Content = []string{}
		} else if currentChapter.Title != "" {
			currentChapter.Content = append(currentChapter.Content, line)
		} else {
			currentChapter.Title = "引言"
			currentChapter.Content = append(currentChapter.Content, line)
		}
	}

	// 保存最后一章
	if currentChapter.Title != "" && len(currentChapter.Content) > 0 {
		chapters = append(chapters, Chapter{
			Title:   currentChapter.Title,
			Content: strings.Join(currentChapter.Content, "\n"),
		})
	}

	// 添加章节编号
	for i := range chapters {
		chapters[i].ChapterNumber = i + 1
	}

	return chapters
}

// 同步数据处理器
func (b *Backend) syncDataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var data struct {
		Scenes  []Scene  `json:"scenes"`
		Prompts []Prompt `json:"prompts"`
		Tags    []Tag    `json:"tags"`
		Config  Config   `json:"config"`
		Agents  []Agent  `json:"agents,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "无效的JSON数据: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 保存所有数据
	scenesFile := filepath.Join(b.dataDir, "scenes.json")
	promptsFile := filepath.Join(b.dataDir, "prompts.json")
	tagsFile := filepath.Join(b.dataDir, "tags.json")
	configFile := filepath.Join(b.dataDir, "config.json")
	agentsFile := filepath.Join(b.dataDir, "agents.json")

	success := true
	success = success && b.saveData(scenesFile, data.Scenes)
	success = success && b.saveData(promptsFile, data.Prompts)
	success = success && b.saveData(tagsFile, data.Tags)
	success = success && b.saveData(configFile, data.Config)

	if data.Agents != nil {
		success = success && b.saveData(agentsFile, data.Agents)
	}

	if !success {
		http.Error(w, "保存部分数据失败", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"success": true})
}

// 获取所有数据处理器
func (b *Backend) getAllDataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var scenes []Scene
	var prompts []Prompt
	var tags []Tag
	var agents []Agent
	var config Config

	scenesFile := filepath.Join(b.dataDir, "scenes.json")
	promptsFile := filepath.Join(b.dataDir, "prompts.json")
	tagsFile := filepath.Join(b.dataDir, "tags.json")
	agentsFile := filepath.Join(b.dataDir, "agents.json")
	configFile := filepath.Join(b.dataDir, "config.json")

	if !b.loadData(scenesFile, &scenes) {
		scenes = []Scene{}
	}
	if !b.loadData(promptsFile, &prompts) {
		prompts = []Prompt{}
	}
	if !b.loadData(tagsFile, &tags) {
		tags = []Tag{}
	}
	if !b.loadData(agentsFile, &agents) {
		agents = []Agent{}
	}
	if !b.loadData(configFile, &config) {
		config = Config{
			Models:         []Model{},
			NotepadContent: "",
			CurrentSceneID: nil,
			SelectedTags:   []interface{}{},
			CurrentView:    "main",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data": map[string]interface{}{
			"scenes":  scenes,
			"prompts": prompts,
			"tags":    tags,
			"agents":  agents,
			"config":  config,
		},
	})
}

// 代理处理器
func (b *Backend) agentsHandler(w http.ResponseWriter, r *http.Request) {
	agentsFile := filepath.Join(b.dataDir, "agents.json")

	// 处理GET请求 - 获取所有代理或单个代理
	if r.Method == http.MethodGet {
		// 检查是否是获取单个代理的请求
		parts := strings.Split(r.URL.Path, "/")
		if len(parts) > 2 && parts[len(parts)-2] == "agents" {
			// 获取单个代理
			agentID := parts[len(parts)-1]
			var agents []Agent
			if !b.loadData(agentsFile, &agents) {
				agents = []Agent{}
			}

			// 查找指定代理
			var agent *Agent
			for i := range agents {
				if fmt.Sprintf("%v", agents[i].ID) == agentID {
					agent = &agents[i]
					break
				}
			}

			if agent == nil {
				http.Error(w, "未找到该代理", http.StatusNotFound)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"data":    agent,
			})
			return
		}

		// 获取所有代理
		var agents []Agent
		if !b.loadData(agentsFile, &agents) {
			agents = []Agent{}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data":    agents,
		})
		return
	}

	// 处理POST请求 - 创建或更新代理
	if r.Method == http.MethodPost {
		var agentData Agent
		if err := json.NewDecoder(r.Body).Decode(&agentData); err != nil {
			http.Error(w, "无效的JSON数据: "+err.Error(), http.StatusBadRequest)
			return
		}

		// 读取现有代理
		var agents []Agent
		if !b.loadData(agentsFile, &agents) {
			agents = []Agent{}
		}

		// 更新现有代理或创建新代理
		if agentData.ID != nil {
			// 更新现有代理
			agentIndex := -1
			for i, a := range agents {
				if fmt.Sprintf("%v", a.ID) == fmt.Sprintf("%v", agentData.ID) {
					agentIndex = i
					break
				}
			}

			if agentIndex != -1 {
				// 保持原有ID不变
				id := agents[agentIndex].ID
				agentData.UpdatedAt = time.Now().Format(time.RFC3339)
				agents[agentIndex] = agentData
				agents[agentIndex].ID = id
			} else {
				// ID存在但找不到对应代理，添加为新代理
				agentData.ID = time.Now().UnixNano() / int64(time.Millisecond)
				agentData.CreatedAt = time.Now().Format(time.RFC3339)
				agentData.UpdatedAt = time.Now().Format(time.RFC3339)
				agents = append(agents, agentData)
			}
		} else {
			// 创建新代理
			agentData.ID = time.Now().UnixNano() / int64(time.Millisecond)
			agentData.CreatedAt = time.Now().Format(time.RFC3339)
			agentData.UpdatedAt = time.Now().Format(time.RFC3339)
			agents = append(agents, agentData)
		}

		// 保存更新后的代理列表
		if b.saveData(agentsFile, agents) {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"data":    agentData,
			})
		} else {
			http.Error(w, "保存代理数据失败", http.StatusInternalServerError)
		}
		return
	}

	http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
}

// 模型处理器
func (b *Backend) modelsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	configFile := filepath.Join(b.dataDir, "config.json")
	var config Config
	if !b.loadData(configFile, &config) {
		config = Config{Models: []Model{}}
	}

	// 提取所有模型信息
	allModels := []Model{}

	// 处理主要模型
	if len(config.Models) > 0 {
		// 添加主要模型
		for _, model := range config.Models {
			allModels = append(allModels, Model{
				ID:       model.ID,
				Name:     model.Name,
				Provider: model.Provider,
				ModelID:  model.ModelID,
			})
		}

		// 添加可用模型列表中的模型
		for _, model := range config.Models {
			if len(model.AvailableModels) > 0 {
				for _, availableModel := range model.AvailableModels {
					// 避免重复添加
					found := false
					for _, m := range allModels {
						if fmt.Sprintf("%v", m.ID) == fmt.Sprintf("%v", availableModel.ID) {
							found = true
							break
						}
					}

					if !found {
						allModels = append(allModels, Model{
							ID:       availableModel.ID,
							Name:     availableModel.Name,
							Provider: model.Provider,
							ModelID:  availableModel.ModelID,
						})
					}
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    allModels,
	})
}

// 添加更新处理器
func (b *Backend) AddUpdateHandler(updater *Updater) {
	// 添加一个标志，防止重复注册
	if b.updateHandlerRegistered {
		return
	}
	b.updateHandlerRegistered = true
}

// 添加设置菜单
func (b *Backend) AddSettingsHandler() {
	// 添加一个标志，防止重复注册
	if b.settingsHandlerRegistered {
		return
	}
	b.settingsHandlerRegistered = true

	// 添加设置API
	http.HandleFunc("/api/settings", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"dataDir": b.dataDir,
			},
		})
	})

	// 添加打开数据目录API
	http.HandleFunc("/api/open-data-dir", func(w http.ResponseWriter, r *http.Request) {
		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command("explorer", b.dataDir)
		} else if runtime.GOOS == "darwin" {
			cmd = exec.Command("open", b.dataDir)
		} else {
			cmd = exec.Command("xdg-open", b.dataDir)
		}

		err := cmd.Start()
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   err.Error(),
			})
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
		})
	})

}

func (b *Backend) apiDocsHandler(w http.ResponseWriter, r *http.Request) {
	routes := []Route{
		{"GET", "/health", "服务器健康检查"},
		{"GET", "/api/test", "测试API服务器是否正常工作"},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    routes,
	})
}

// 统一的响应处理函数
func sendSuccessResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    data,
	})
}

func sendErrorResponse(w http.ResponseWriter, r *http.Request, err error, status int) {
	logger.LogAPIError(r.Method, r.URL.Path, err)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"error":   err.Error(),
	})
}
