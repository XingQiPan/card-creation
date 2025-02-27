package main

import (
	"context"
	"encoding/json"
	"fmt"
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

	return &Backend{
		dataDir:    dataDir,
		uploadsDir: uploadsDir,
		port:       3000,
		running:    false,
	}
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
	mux.HandleFunc("/api/test", b.testHandler)
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

	// 添加更新处理器
	if updater != nil {
		b.AddUpdateHandler(updater)
	}

	// 添加设置菜单
	b.AddSettingsHandler()

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

	for file, defaultData := range files {
		if _, err := os.Stat(file); os.IsNotExist(err) {
			b.saveData(file, defaultData)
		}
	}

	// 确保配置文件存在
	b.ensureConfigFile()
}

// 确保配置文件存在
func (b *Backend) ensureConfigFile() {
	configFile := filepath.Join(b.dataDir, "config.json")
	if _, err := os.Stat(configFile); os.IsNotExist(err) {
		// 创建默认配置
		defaultConfig := map[string]interface{}{
			"models": []interface{}{},
			"agents": []interface{}{},
		}

		// 如果有模型数据，保留它
		var existingConfig map[string]interface{}
		if b.loadData(configFile, &existingConfig) && existingConfig["models"] != nil {
			defaultConfig["models"] = existingConfig["models"]
		}

		// 保存默认配置
		b.saveData(configFile, defaultConfig)
		log.Println("创建默认配置文件")
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
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
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
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	var scenes []Scene
	scenesFile := filepath.Join(b.dataDir, "scenes.json")
	if !b.loadData(scenesFile, &scenes) {
		scenes = []Scene{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"data":    scenes,
	})
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

	var config Config
	if err := json.NewDecoder(r.Body).Decode(&config); err != nil {
		http.Error(w, "无效的JSON数据", http.StatusBadRequest)
		return
	}

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
	if r.Method != http.MethodPost {
		http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
		return
	}

	// 解析多部分表单
	err := r.ParseMultipartForm(50 * 1024 * 1024) // 50MB 限制
	if err != nil {
		http.Error(w, "解析表单失败: "+err.Error(), http.StatusBadRequest)
		return
	}

	// 获取场景ID
	sceneId := r.FormValue("sceneId")
	if sceneId == "" {
		http.Error(w, "缺少场景ID", http.StatusBadRequest)
		return
	}

	// 获取上传的文件
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "获取文件失败: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	log.Printf("接收到文件: %s, 大小: %d", header.Filename, header.Size)

	// 创建临时文件
	tempFile, err := ioutil.TempFile(b.uploadsDir, "upload-*")
	if err != nil {
		http.Error(w, "创建临时文件失败: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.Remove(tempFile.Name())
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

	// 添加更新API
	http.HandleFunc("/api/check-update", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"data": map[string]interface{}{
				"needUpdate":     updater.needUpdate,
				"currentVersion": updater.currentVersion,
				"latestVersion":  updater.latestVersion,
			},
		})
	})

	// 添加下载更新API
	http.HandleFunc("/api/download-update", func(w http.ResponseWriter, r *http.Request) {
		downloadPath, err := updater.DownloadUpdate()
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
			"data": map[string]interface{}{
				"downloadPath": downloadPath,
			},
		})
	})

	// 添加应用更新API
	http.HandleFunc("/api/apply-update", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "方法不允许", http.StatusMethodNotAllowed)
			return
		}

		var data struct {
			DownloadPath string `json:"downloadPath"`
		}

		if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"error":   "解析请求失败",
			})
			return
		}

		err := updater.ApplyUpdate(data.DownloadPath)
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
			"data":    "更新将在应用重启后应用",
		})
	})

	// 添加更新页面
	http.HandleFunc("/update", func(w http.ResponseWriter, r *http.Request) {
		html := `
		<!DOCTYPE html>
		<html>
		<head>
			<title>版本更新通知</title>
			<meta charset="utf-8">
			<style>
				body { font-family: Arial, sans-serif; margin: 20px; }
				.notification { background-color: #f8f9fa; border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
				.update-btn { background-color: #007bff; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; }
				.version { font-weight: bold; }
				.progress { margin-top: 10px; display: none; }
				.progress-bar { height: 20px; background-color: #e9ecef; border-radius: 5px; overflow: hidden; }
				.progress-bar-fill { height: 100%; width: 0%; background-color: #007bff; transition: width 0.3s; }
				.status { margin-top: 5px; font-size: 14px; }
			</style>
		</head>
		<body>
			<div class="notification">
				<h2>发现新版本</h2>
				<p>当前版本: <span class="version">v%s</span></p>
				<p>最新版本: <span class="version">v%s</span></p>
				<p>建议更新到最新版本以获取最新功能和修复。</p>
				<button id="updateBtn" class="update-btn">立即更新</button>
				<div id="progress" class="progress">
					<div class="progress-bar">
						<div id="progressBarFill" class="progress-bar-fill"></div>
					</div>
					<div id="status" class="status">准备更新...</div>
				</div>
			</div>
			
			<script>
				document.getElementById('updateBtn').addEventListener('click', async function() {
					this.disabled = true;
					document.getElementById('progress').style.display = 'block';
					document.getElementById('status').textContent = '正在下载更新...';
					
					try {
						// 下载更新
						const downloadResponse = await fetch('/api/download-update');
						const downloadResult = await downloadResponse.json();
						
						if (!downloadResult.success) {
							throw new Error(downloadResult.error || '下载更新失败');
						}
						
						document.getElementById('progressBarFill').style.width = '50%';
						document.getElementById('status').textContent = '下载完成，准备安装...';
						
						// 应用更新
						const applyResponse = await fetch('/api/apply-update', {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								downloadPath: downloadResult.data.downloadPath
							})
						});
						
						const applyResult = await applyResponse.json();
						
						if (!applyResult.success) {
							throw new Error(applyResult.error || '应用更新失败');
						}
						
						document.getElementById('progressBarFill').style.width = '100%';
						document.getElementById('status').textContent = '更新成功，应用将重启...';
						
					} catch (error) {
						document.getElementById('status').textContent = '更新失败: ' + error.message;
						this.disabled = false;
					}
				});
			</script>
		</body>
		</html>
		`

		html = fmt.Sprintf(html, updater.currentVersion, updater.latestVersion)

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(html))
	})
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

	// 添加设置页面
	http.HandleFunc("/settings", func(w http.ResponseWriter, r *http.Request) {
		// 设置页面HTML
		html := `<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>星卡写作 - 设置</title>
			<style>
				body {
					font-family: Arial, sans-serif;
					line-height: 1.6;
					margin: 0;
					padding: 20px;
					color: #333;
					background-color: #f5f5f5;
				}
				h1 {
					color: #2c3e50;
					border-bottom: 1px solid #eee;
					padding-bottom: 10px;
				}
				.container {
					max-width: 800px;
					margin: 0 auto;
					background-color: white;
					padding: 20px;
					border-radius: 5px;
					box-shadow: 0 2px 5px rgba(0,0,0,0.1);
				}
				.setting-group {
					margin-bottom: 20px;
					padding-bottom: 20px;
					border-bottom: 1px solid #eee;
				}
				.setting-title {
					font-weight: bold;
					margin-bottom: 10px;
				}
				.setting-value {
					background-color: #f8f8f8;
					padding: 10px;
					border-radius: 3px;
					font-family: Consolas, monospace;
				}
				button {
					background-color: #3498db;
					color: white;
					border: none;
					padding: 8px 15px;
					border-radius: 3px;
					cursor: pointer;
				}
				button:hover {
					background-color: #2980b9;
				}
				.danger-button {
					background-color: #e74c3c;
				}
				.danger-button:hover {
					background-color: #c0392b;
				}
			</style>
		</head>
		<body>
			<div class="container">
				<h1>星卡写作 - 设置</h1>
				
				<div class="setting-group">
					<div class="setting-title">数据存储位置</div>
					<div class="setting-value" id="dataDir">加载中...</div>
					<p>这是您的卡片数据、场景和配置存储的位置。</p>
					<button id="openDataDirBtn">打开数据目录</button>
				</div>
				
				<div class="setting-group">
					<div class="setting-title">危险操作</div>
					<p>以下操作可能会导致数据丢失，请谨慎操作。</p>
					<button id="uninstallBtn" class="danger-button">卸载应用</button>
				</div>
			</div>
			
			<script>
				async function loadSettings() {
					try {
						const response = await fetch('/api/settings');
						const result = await response.json();
						
						if (result.success) {
							document.getElementById('dataDir').textContent = result.data.dataDir;
						} else {
							document.getElementById('dataDir').textContent = '获取失败';
						}
					} catch (error) {
						document.getElementById('dataDir').textContent = '获取失败: ' + error.message;
					}
				}
				
				// 打开数据目录
				document.getElementById('openDataDirBtn').addEventListener('click', async function() {
					try {
						await fetch('/api/open-data-dir');
					} catch (error) {
						alert('打开数据目录失败: ' + error.message);
					}
				});
				
				// 卸载应用
				document.getElementById('uninstallBtn').addEventListener('click', function() {
					if (confirm('确定要卸载应用吗？这将删除所有数据！')) {
						window.location.href = 'app://uninstall';
					}
				});
				
				// 加载设置
				loadSettings();
			</script>
		</body>
		</html>
		`

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(html))
	})
}
