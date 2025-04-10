# WebDAV云同步功能使用指南

星卡写作现已支持通过WebDAV协议实现数据的云端同步和版本控制，让您的数据更加安全，同时支持多设备之间的同步。

## 功能特点

- **云端备份**：将您的数据自动备份到WebDAV云服务
- **版本控制**：每次备份都带有时间戳，方便恢复到历史版本
- **自动同步**：自动定时备份，无需手动操作
- **安全可靠**：在恢复云端数据前，会自动创建本地备份

## 配置说明

### 1. 准备WebDAV服务

您需要有一个支持WebDAV协议的云存储服务，例如：
- 坚果云
- NextCloud
- Box.com
- Yandex.Disk
- 等其他支持WebDAV的云存储服务

### 2. 设置环境变量

在`backend`文件夹中创建一个`.env`文件（基于`.env.example`模板），并填入您的WebDAV信息：

```
# WebDAV云同步配置
WEBDAV_URL=https://your-webdav-server.com/dav/
WEBDAV_USERNAME=your_username
WEBDAV_PASSWORD=your_password

# 服务器配置
PORT=3000
```

### 3. 重启应用

配置完成后，重启星卡写作应用，服务器将自动连接到您的WebDAV服务。

## 备份存储路径

- **云端备份**：所有备份都保存在WebDAV服务的`/CardCreationBackup`目录中
- **本地备份**：备份文件存储在`backend/DataBackup`目录中

## 本地备份管理

除了云端备份外，系统还支持本地备份的管理和恢复功能。这在WebDAV服务不可用或您希望在本地快速恢复数据时非常有用。

### 查看本地备份列表

您可以通过以下API查看所有本地备份：

```
GET /api/local/backups
```

这将返回所有可用的本地备份列表，包括文件名、大小和修改日期。

### 从本地备份恢复

要从本地备份恢复数据：

```
POST /api/local/restore
{
  "backupPath": "H:/ds/xk4.9/card-creation-main/backend/DataBackup/data-backup-2023-05-16T14-30-00.zip"
}
```

**注意**：恢复备份前，系统会自动创建当前数据的备份，以防止数据丢失。

## 使用方法

### 手动备份

在界面中，您可以通过API调用手动执行备份：

```
POST /api/cloud/sync
```

这将创建一个带有当前时间戳的备份并上传到云端。

### 查看备份列表

您可以查看所有云端备份：

```
GET /api/cloud/backups
```

这将返回所有可用备份的列表，包括文件名、大小和修改日期。

### 恢复备份

要恢复特定备份：

```
POST /api/cloud/restore
{
  "backupPath": "/CardCreationBackup/data-backup-2023-05-16T14-30-00.zip"
}
```

**注意**：恢复备份前，系统会自动创建当前数据的备份，以防止数据丢失。本地备份将保存在`backend/DataBackup`目录中。

### 删除备份

要删除不需要的备份：

```
DELETE /api/cloud/backups
{
  "backupPath": "/CardCreationBackup/data-backup-2023-05-16T14-30-00.zip"
}
```

## 自动备份

系统默认每24小时自动执行一次备份。所有备份都保存在WebDAV服务的`/CardCreationBackup`目录中。

## 常见问题

### 1. 如何确认WebDAV连接是否成功？

您可以通过访问以下API检查连接状态：

```
GET /api/cloud/status
```

如果返回`{ "success": true }`，则表示连接成功。

### 2. 备份文件太多，如何管理？

您可以通过API删除不需要的旧备份。我们建议保留最近几个备份，以便在需要时恢复。

### 3. 恢复备份后，数据丢失怎么办？

每次恢复操作前，系统都会自动创建当前数据的本地备份。您可以在`backend/DataBackup`目录中找到以`data-local-backup-[timestamp].zip`命名的文件。

### 4. 如何在多设备间同步数据？

目前需要在每台设备上单独配置WebDAV服务。您可以在一台设备上创建备份，然后在另一台设备上恢复该备份。

---

如有任何问题或建议，请联系我们的支持团队。