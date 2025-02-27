package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"go-card-creation/utils"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go-card-creation/logger"
	"golang.org/x/sys/windows/registry"
)

//go:embed frontend/dist
var assets embed.FS

// 版本信息结构体
type VersionInfo struct {
	FrontendVersion string `json:"frontendVersion"`
	BackendVersion  string `json:"backendVersion"`
	LatestFrontend  string `json:"latestFrontend"`
	LatestBackend   string `json:"latestBackend"`
	NeedUpdate      bool   `json:"needUpdate"`
}

// 自动更新结构体
type Updater struct {
	ctx            context.Context
	currentVersion string
	latestVersion  string
	downloadURL    string
	updatePath     string
	needUpdate     bool
}

// 创建新的更新器
func NewUpdater(ctx context.Context, currentVersion string) *Updater {
	// 获取临时目录
	tempDir := os.TempDir()
	updatePath := filepath.Join(tempDir, "星卡写作更新")

	// 确保更新目录存在
	os.MkdirAll(updatePath, 0755)

	return &Updater{
		ctx:            ctx,
		currentVersion: currentVersion,
		updatePath:     updatePath,
	}
}

// 检查更新
func (u *Updater) CheckForUpdates() bool {
	// 获取最新版本和下载URL
	latestVersion, downloadURL := getBackendVersion()
	if latestVersion == "" || downloadURL == "与GitHub仓库断连" {
		return false
	}

	u.latestVersion = latestVersion
	u.downloadURL = downloadURL
	u.needUpdate = latestVersion != u.currentVersion

	return u.needUpdate
}

// 下载更新
func (u *Updater) DownloadUpdate() (string, error) {
	if !u.needUpdate {
		return "", fmt.Errorf("无需更新")
	}

	// 创建下载文件
	downloadPath := filepath.Join(u.updatePath, "星卡写作.exe")
	out, err := os.Create(downloadPath)
	if err != nil {
		return "", fmt.Errorf("创建下载文件失败: %v", err)
	}
	defer out.Close()

	// 下载文件
	client := &http.Client{
		Timeout: 300 * time.Second, // 增加超时时间到5分钟
	}

	log.Printf("开始下载更新，URL: %s", u.downloadURL)
	resp, err := client.Get(u.downloadURL)
	if err != nil {
		return "", fmt.Errorf("下载更新失败: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("下载更新失败，状态码: %d", resp.StatusCode)
	}

	// 写入文件
	_, err = io.Copy(out, resp.Body)
	if err != nil {
		return "", fmt.Errorf("写入更新文件失败: %v", err)
	}

	log.Printf("更新文件下载完成: %s", downloadPath)
	return downloadPath, nil
}

// 应用更新
func (u *Updater) ApplyUpdate(downloadPath string) error {
	// 从注册表获取安装路径
	key, err := registry.OpenKey(
		registry.CURRENT_USER,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe`,
		registry.QUERY_VALUE,
	)
	if err != nil {
		return fmt.Errorf("获取注册表安装路径失败: %v", err)
	}
	defer key.Close()

	// 获取安装路径
	exePath, _, err := key.GetStringValue("")
	if err != nil {
		return fmt.Errorf("读取注册表安装路径失败: %v", err)
	}

	log.Printf("从注册表获取的安装路径: %s", exePath)
	log.Printf("更新文件路径: %s", downloadPath)

	// 创建更新批处理文件
	batchPath := filepath.Join(u.updatePath, "update.bat")
	batchContent := fmt.Sprintf(`@echo off
echo 正在更新星卡写作...
timeout /t 2 /nobreak > nul
taskkill /F /IM "星卡写作.exe" /T
timeout /t 2 /nobreak > nul
copy /Y "%s" "%s"
if errorlevel 1 (
    echo 更新失败，请以管理员身份运行程序
    pause
    exit /b 1
)
start "" "%s"
del "%s"
del "%s"
exit
`, downloadPath, exePath, exePath, downloadPath, batchPath)

	err = ioutil.WriteFile(batchPath, []byte(batchContent), 0755)
	if err != nil {
		return fmt.Errorf("创建更新批处理文件失败: %v", err)
	}

	log.Printf("创建更新脚本: %s", batchPath)

	// 启动批处理文件
	cmd := exec.Command("cmd", "/C", "start", "/min", batchPath)
	err = cmd.Start()
	if err != nil {
		return fmt.Errorf("启动更新批处理文件失败: %v", err)
	}

	// 退出应用
	go func() {
		time.Sleep(1 * time.Second)
		os.Exit(0)
	}()

	return nil
}

// 从GitHub获取前端版本
func getFrontendVersion() string {
	url := "https://raw.githubusercontent.com/XingQiPan/card-creation/main/package.json"
	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		log.Printf("获取前端版本失败: %v", err)
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("获取前端版本失败，状态码: %d", resp.StatusCode)
		return ""
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("读取响应失败: %v", err)
		return ""
	}

	var packageJSON map[string]interface{}
	if err := json.Unmarshal(body, &packageJSON); err != nil {
		log.Printf("解析JSON失败: %v", err)
		return ""
	}

	if version, ok := packageJSON["version"].(string); ok {
		return version
	}

	return ""
}

// 从GitHub获取后端版本
func getBackendVersion() (string, string) {
	// 获取 GitHub 最新版本
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("https://api.github.com/repos/XingQiPan/card-creation/releases/latest")

	if err != nil {
		log.Printf("创建请求失败: %v", err)
		return "", "与GitHub仓库断连"
	}

	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("获取后端版本失败，状态码: %d", resp.StatusCode)
		return "", "与GitHub仓库断连"
	}

	var releaseInfo struct {
		TagName string `json:"tag_name"`
	}

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("读取响应失败: %v", err)
		return "", "与GitHub仓库断连"
	}

	log.Printf("GitHub API 响应: %s", string(body)) // 添加调试日志

	if err := json.Unmarshal(body, &releaseInfo); err != nil {
		log.Printf("解析JSON失败: %v", err)
		return "", "与GitHub仓库断连"
	}

	if releaseInfo.TagName == "" {
		log.Printf("获取版本号失败，TagName为空")
		return "", "与GitHub仓库断连"
	}

	// 获取版本号（包含v前缀）
	version := strings.TrimPrefix(releaseInfo.TagName, "v")
	// 构造固定格式的下载URL
	downloadURL := fmt.Sprintf("https://github.com/XingQiPan/card-creation/releases/download/v%s/v%s.exe", version, version)

	log.Printf("最新版本: %s", version)
	log.Printf("下载地址: %s", downloadURL)

	return version, downloadURL
}

// 注册表集成
func RegisterApplication() error {
	// 获取当前可执行文件路径
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取当前可执行文件路径失败: %v", err)
	}

	// 打开注册表
	key, _, err := registry.CreateKey(
		registry.CURRENT_USER,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe`,
		registry.ALL_ACCESS,
	)
	if err != nil {
		return fmt.Errorf("创建注册表键失败: %v", err)
	}
	defer key.Close()

	// 设置默认值
	err = key.SetStringValue("", exePath)
	if err != nil {
		return fmt.Errorf("设置注册表值失败: %v", err)
	}

	// 设置路径
	err = key.SetStringValue("Path", filepath.Dir(exePath))
	if err != nil {
		return fmt.Errorf("设置注册表路径失败: %v", err)
	}

	// 添加到卸载列表
	uninstallKey, _, err := registry.CreateKey(
		registry.CURRENT_USER,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\星卡写作`,
		registry.ALL_ACCESS,
	)
	if err != nil {
		return fmt.Errorf("创建卸载注册表键失败: %v", err)
	}
	defer uninstallKey.Close()

	// 设置卸载信息
	uninstallKey.SetStringValue("DisplayName", "星卡写作")
	uninstallKey.SetStringValue("DisplayVersion", "1.0.0")
	uninstallKey.SetStringValue("Publisher", "山河")
	uninstallKey.SetStringValue("DisplayIcon", exePath)
	uninstallKey.SetStringValue("UninstallString", fmt.Sprintf("\"%s\" --uninstall", exePath))
	uninstallKey.SetStringValue("InstallLocation", filepath.Dir(exePath))
	uninstallKey.SetDWordValue("NoModify", 1)
	uninstallKey.SetDWordValue("NoRepair", 1)

	return nil
}

// 卸载应用
func UninstallApplication() error {
	// 获取当前可执行文件路径
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取当前可执行文件路径失败: %v", err)
	}

	// 获取应用数据目录
	appDataDir, err := os.UserConfigDir()
	if err != nil {
		return fmt.Errorf("获取应用数据目录失败: %v", err)
	}
	dataDir := filepath.Join(appDataDir, "星卡写作")

	// 创建卸载批处理文件
	uninstallDir := filepath.Join(os.TempDir(), "星卡写作卸载")
	os.MkdirAll(uninstallDir, 0755)

	batchPath := filepath.Join(uninstallDir, "uninstall.bat")
	batchContent := fmt.Sprintf(`@echo off
echo 正在卸载星卡写作...
timeout /t 2 /nobreak > nul
del "%s"
rmdir /S /Q "%s"
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe" /f
reg delete "HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\星卡写作" /f
echo 卸载完成!
timeout /t 2 /nobreak > nul
del "%s"
exit
`, exePath, dataDir, batchPath)

	err = ioutil.WriteFile(batchPath, []byte(batchContent), 0755)
	if err != nil {
		return fmt.Errorf("创建卸载批处理文件失败: %v", err)
	}

	// 启动批处理文件
	cmd := exec.Command("cmd", "/C", "start", batchPath)
	err = cmd.Start()
	if err != nil {
		return fmt.Errorf("启动卸载批处理文件失败: %v", err)
	}

	return nil
}

// 创建应用菜单
func createMenu(ctx context.Context, backend *Backend, updater *Updater, version string) *menu.Menu {
	appMenu := menu.NewMenu()

	// 设置菜单
	settingsMenu := appMenu.AddSubmenu("设置")
	settingsMenu.AddText("打开存放数据目录", nil, func(_ *menu.CallbackData) {
		utils.OpenDirectory(backend.dataDir)
	})

	// 更新菜单
	updateMenu := appMenu.AddSubmenu("更新")
	updateMenu.AddText("检查更新", nil, func(_ *menu.CallbackData) {
		// 检查更新，添加错误处理
		needUpdate := false
		defer func() {
			if r := recover(); r != nil {
				runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
					Type:    runtime.ErrorDialog,
					Title:   "检查更新失败",
					Message: "检查更新时发生错误，请检查网络连接",
				})
			}
		}()

		needUpdate = updater.CheckForUpdates()

		if needUpdate && updater.latestVersion != "" {
			// 询问用户是否要更新
			_, _ = runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:          runtime.QuestionDialog,
				Title:         "发现新版本",
				Message:       fmt.Sprintf("当前版本：%s\n最新版本：%s\n\n是否立即更新？", version, updater.latestVersion),
				Buttons:       []string{"是", "否"},
				DefaultButton: "是",
			})

			runtime.BrowserOpenURL(ctx, fmt.Sprintf("https://github.com/XingQiPan/card-creation/releases/download/v%s/v%s.exe", updater.latestVersion, updater.latestVersion))
		} else {
			runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
				Type:    runtime.InfoDialog,
				Title:   "检查更新",
				Message: "您当前使用的已经是最新版本！",
			})
		}
	})

	// 帮助菜单
	helpMenu := appMenu.AddSubmenu("帮助")
	helpMenu.AddText("关于", nil, func(_ *menu.CallbackData) {
		runtime.MessageDialog(ctx, runtime.MessageDialogOptions{
			Type:    runtime.InfoDialog,
			Title:   "关于星卡写作",
			Message: fmt.Sprintf("星卡写作 v%s\n\n基于 https://github.com/XingQiPan/card-creation\n\n由山河开发的桌面版本", version),
		})
	})
	helpMenu.AddText("访问GitHub", nil, func(_ *menu.CallbackData) {
		runtime.BrowserOpenURL(ctx, "https://github.com/XingQiPan/card-creation/releases/latest")
	})

	return appMenu
}

func main() {
	// 获取应用安装路径
	exePath, err := os.Executable()
	if err != nil {
		log.Printf("获取应用路径失败: %v", err)
		return
	}
	appPath := filepath.Dir(exePath)

	// 初始化错误日志记录器
	if err := logger.InitErrorLogger(appPath); err != nil {
		log.Printf("初始化错误日志记录器失败: %v", err)
	}

	// 捕获全局panic
	defer func() {
		if r := recover(); r != nil {
			logger.LogError(r)
			// 显示错误对话框
			runtime.MessageDialog(context.Background(), runtime.MessageDialogOptions{
				Type:    runtime.ErrorDialog,
				Title:   "程序发生错误",
				Message: "程序遇到了一个错误，详细信息已记录到错误日志。",
			})
		}
	}()

	// 检查命令行参数
	for _, arg := range os.Args {
		if arg == "--uninstall" {
			UninstallApplication()
			return
		}
	}

	// 注册应用到注册表
	err = RegisterApplication()
	if err != nil {
		log.Printf("注册应用失败: %v", err)
	}

	// 创建应用实例
	app := NewApp()

	// 创建后端服务实例
	backend := NewBackend()

	// 获取版本信息
	// 前端
	currentFrontendVersion := "0.9.2"
	// 后端
	currentBackendVersion := "1.5.0"
	// 获取最新前端版本
	latestFrontendVersion := getFrontendVersion()
	// 获取最新后端版本和下载URL
	latestBackendVersion, downloadURL := getBackendVersion()

	// 创建更新器
	updater := NewUpdater(context.Background(), currentBackendVersion)
	updater.latestVersion = latestBackendVersion
	updater.downloadURL = downloadURL
	updater.needUpdate = latestBackendVersion != currentBackendVersion

	// 检查更新
	needUpdate := updater.CheckForUpdates()

	// 检查是否需要更新
	needUpdate = (latestFrontendVersion != "" && latestFrontendVersion != currentFrontendVersion) ||
		(latestBackendVersion != "" && latestBackendVersion != currentBackendVersion)

	// 构建标题
	title := fmt.Sprintf("星卡写作 - 前端v%s 后端v%s", currentFrontendVersion, currentBackendVersion)

	// 如果与GitHub断连
	if latestBackendVersion == "" && downloadURL == "与GitHub仓库断连" {
		title += " (与GitHub仓库断连)"
	} else if needUpdate {
		// 如果需要更新
		title += " (有新版本可用)"
	}

	// 创建应用配置
	err = wails.Run(&options.App{
		Title:  title,
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup: func(ctx context.Context) {
			app.startup(ctx)
			// 启动后端服务，传入updater
			backend.StartServer(ctx, updater)

			// 设置菜单 - 使用正确的 context
			runtime.MenuSetApplicationMenu(ctx, createMenu(ctx, backend, updater, currentBackendVersion))

			// 设置版本信息
			versionInfo := VersionInfo{
				FrontendVersion: currentFrontendVersion,
				BackendVersion:  currentBackendVersion,
				LatestFrontend:  latestFrontendVersion,
				LatestBackend:   latestBackendVersion,
				NeedUpdate:      needUpdate,
			}

			// 将版本信息传递给前端
			app.SetVersionInfo(versionInfo)

			// 如果需要更新，显示更新提示
			if needUpdate {
				// 添加更新API
				backend.AddUpdateHandler(updater)
			}

			// 添加设置菜单
			backend.AddSettingsHandler()
		},
		OnShutdown: func(ctx context.Context) {
			// 关闭后端服务
			backend.StopServer()
		},
		Bind: []interface{}{
			app,
			backend,
		},
		// Windows特定选项
		Windows: &windows.Options{
			WebviewIsTransparent:              false,
			WindowIsTranslucent:               false,
			DisableWindowIcon:                 false,
			DisableFramelessWindowDecorations: false,
			WebviewUserDataPath:               "",
			Theme:                             windows.SystemDefault,
			CustomTheme: &windows.ThemeSettings{
				DarkModeTitleBar:   windows.RGB(20, 20, 20),
				DarkModeTitleText:  windows.RGB(200, 200, 200),
				DarkModeBorder:     windows.RGB(20, 0, 20),
				LightModeTitleBar:  windows.RGB(200, 200, 200),
				LightModeTitleText: windows.RGB(20, 20, 20),
				LightModeBorder:    windows.RGB(200, 200, 200),
			},
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
