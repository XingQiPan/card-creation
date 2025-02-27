package logger

import (
	"fmt"
	"golang.org/x/sys/windows/registry"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"runtime/debug"
	"time"
)

var (
	errorLogger  *log.Logger
	errorLogPath string
)

// 初始化错误日志记录器
func InitErrorLogger(appPath string) error {
	// 尝试从注册表获取安装路径
	key, err := registry.OpenKey(
		registry.CURRENT_USER,
		`SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\星卡写作.exe`,
		registry.QUERY_VALUE,
	)
	if err == nil {
		defer key.Close()
		if installPath, _, err := key.GetStringValue(""); err == nil {
			appPath = filepath.Dir(installPath)
		}
	}

	// 创建错误日志目录
	errorLogPath = filepath.Join(appPath, "error")
	if err := os.MkdirAll(errorLogPath, 0755); err != nil {
		return fmt.Errorf("创建错误日志目录失败: %v", err)
	}

	log.Printf("错误日志目录: %s", errorLogPath)
	return nil
}

// 记录错误
func LogError(err interface{}) {
	// 生成日志文件名
	timestamp := time.Now().Format("20060102_150405")
	randomCode := fmt.Sprintf("%04d", rand.Intn(10000))
	logFileName := fmt.Sprintf("error_%s_%s.txt", timestamp, randomCode)
	logFilePath := filepath.Join(errorLogPath, logFileName)

	// 创建日志文件
	f, err := os.Create(logFilePath)
	if err != nil {
		return
	}
	defer f.Close()

	// 创建日志记录器
	errorLogger = log.New(f, "", log.LstdFlags)

	// 记录错误信息
	errorLogger.Printf("错误类型: %T\n", err)
	errorLogger.Printf("错误信息: %v\n", err)
	errorLogger.Printf("堆栈跟踪:\n%s", debug.Stack())
}

// LogAPIError 记录API错误
func LogAPIError(method string, path string, err error) {
	LogError(fmt.Sprintf("API错误 - %s %s: %v", method, path, err))
}

// LogFileError 记录文件操作错误
func LogFileError(operation string, filePath string, err error) {
	LogError(fmt.Sprintf("文件操作错误 - %s %s: %v", operation, filePath, err))
}
