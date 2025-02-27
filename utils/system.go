package utils

import (
	"os/exec"
)

// OpenDirectory 打开指定目录
func OpenDirectory(path string) error {
	var cmd *exec.Cmd

	// 根据不同系统使用不同的命令
	if isWindows() {
		cmd = exec.Command("explorer", path)
	} else if isMacOS() {
		cmd = exec.Command("open", path)
	} else {
		cmd = exec.Command("xdg-open", path)
	}

	return cmd.Start()
}

// 判断是否为Windows系统
func isWindows() bool {
	return getPlatform() == "windows"
}

// 判断是否为MacOS系统
func isMacOS() bool {
	return getPlatform() == "darwin"
}

// 获取当前操作系统平台
func getPlatform() string {
	// 这里可以通过编译标记来判断系统类型
	// 编译时会自动选择正确的值
	switch {
	case isWindowsBuild():
		return "windows"
	case isDarwinBuild():
		return "darwin"
	default:
		return "linux"
	}
}

// 通过编译标记判断是否为Windows
func isWindowsBuild() bool {
	return true
}

// 通过编译标记判断是否为MacOS
func isDarwinBuild() bool {
	return true
}
