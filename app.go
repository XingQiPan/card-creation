package main

import (
	"context"
)

// App struct
type App struct {
	ctx         context.Context
	versionInfo VersionInfo
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return "启动成功，来自github开发者 shanheinfo / （山河） 的问候：" + name + "!"
}

// SetVersionInfo 设置版本信息
func (a *App) SetVersionInfo(info VersionInfo) {
	a.versionInfo = info
}

// GetVersionInfo 获取版本信息
func (a *App) GetVersionInfo() VersionInfo {
	return a.versionInfo
}

// CheckForUpdates 检查更新
func (a *App) CheckForUpdates() VersionInfo {
	// 这里可以添加实时检查逻辑
	return a.versionInfo
}
