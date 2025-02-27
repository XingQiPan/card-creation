package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
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

func main() {
	// 创建应用实例
	app := NewApp()

	// 创建后端服务实例
	backend := NewBackend()

	// 获取版本信息
	// 前端
	currentFrontendVersion := "0.1.0"
	// 后端
	currentBackendVersion := "1.0.0"
	// 获取最新前端版本
	latestFrontendVersion := getFrontendVersion()

	// 构建标题
	title := fmt.Sprintf("星卡写作 - 前端v%s 后端v%s", currentFrontendVersion, currentBackendVersion)

	// 创建应用配置
	err := wails.Run(&options.App{
		Title:  title,
		Width:  1024,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup: func(ctx context.Context) {
			app.startup(ctx)
			// 启动后端服务
			backend.StartServer(ctx)

			// 设置版本信息
			versionInfo := VersionInfo{
				FrontendVersion: currentFrontendVersion,
				BackendVersion:  currentBackendVersion,
				LatestFrontend:  latestFrontendVersion,
				LatestBackend:   currentBackendVersion,
				NeedUpdate:      latestFrontendVersion != "" && latestFrontendVersion != currentFrontendVersion,
			}

			// 将版本信息传递给前端
			app.SetVersionInfo(versionInfo)
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
			// 移除不支持的选项
		},
	})

	if err != nil {
		log.Fatal(err)
	}
}
