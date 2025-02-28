#define MyAppName "星卡写作"
#define MyAppVersion "1.6.0"
#define MyAppPublisher "山河"
#define MyAppURL "https://github.com/XingQiPan/card-creation/releases/latest"
#define MyAppExeName "星卡写作.exe"

[Setup]
; 注意: AppId的值为单独标识此应用程序。
; 不要在其他安装程序中使用相同的AppId值。
AppId={{F4C8E8A1-DB76-45B3-A7D4-E23B9E6C42F5}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
; 允许用户选择安装目录
DisableDirPage=no
DisableProgramGroupPage=no
LicenseFile=LICENSE.txt
; 以下行取消注释，以在非管理安装模式下运行（仅为当前用户安装）。
;PrivilegesRequired=lowest
OutputDir=installer
OutputBaseFilename=星卡写作安装程序_{#MyAppVersion}
SetupIconFile=icon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
WindowVisible=no
WindowShowCaption=no
WindowResizable=no
WindowStartMaximized=no
BackColor=$FFFFFF
BackSolid=yes
DisableWelcomePage=no


[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode
Name: "autoupdate"; Description: "启用自动更新"; GroupDescription: "更新选项:"; Flags: unchecked

[Files]
Source: "build\bin\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "screenshot.bmp"; DestDir: "{tmp}"; Flags: dontcopy
Source: "auto_update.bat"; DestDir: "{app}"; Flags: ignoreversion
; 注意: 不要在任何共享系统文件上使用"Flags: ignoreversion"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:ProgramOnTheWeb,{#MyAppName}}"; Filename: "{#MyAppURL}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[Dirs]
; 添加 error 目录，并设置权限
Name: "{app}\error"; Permissions: everyone-full

[CustomMessages]
chinesesimplified.ProgramInfo=应用相关信息
chinesesimplified.Screenshot=应用运行预览图
chinesesimplified.IssueSubmission=问题提交
chinesesimplified.UpdateLog=更新日志
chinesesimplified.WelcomeTitle=欢迎安装 星卡写作
chinesesimplified.WelcomeDesc=一个现代化的提示词编辑和管理系统

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    if MsgBox('安装将关闭所有正在运行的星卡写作实例。是否继续？', mbConfirmation, MB_YESNO) = IDYES then
    begin
      Exec('taskkill.exe', '/F /IM "星卡写作.exe"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
  if CurStep = ssPostInstall then
  begin
    if WizardIsTaskSelected('autoupdate') then
    begin
      SaveStringToFile(ExpandConstant('{app}\autoupdate.txt'), 'true', False);
    end;
  end;
end;

procedure InitializeWizard();
var
  AuthorPage, ScreenshotPage, IssuePage, UpdateLogPage: TWizardPage;
  Label1, Label2, Label3: TNewStaticText;
  Image: TBitmapImage;
  ImagePath: String;
  RichEditViewer: TRichEditViewer;  
begin
  // 设置窗口样式

  WizardForm.InnerPage.Color := $FFFFFF;
  WizardForm.Bevel.Visible := False;  
  WizardForm.Font.Name := 'Microsoft YaHei UI';
  WizardForm.Font.Size := 9;
  
  // 设置标题样式
 
  
  // 移除默认边框和背景
  WizardForm.MainPanel.Color := $FFFFFF;
  WizardForm.MainPanel.ParentBackground := False;
  WizardForm.InnerPage.ParentBackground := False;
  WizardForm.OuterNotebook.ParentBackground := False;

  ExtractTemporaryFile('screenshot.bmp');
  ImagePath := ExpandConstant('{tmp}\screenshot.bmp');

  // 创建作者信息页面 - 第一个显示
  AuthorPage := CreateCustomPage(wpWelcome, CustomMessage('ProgramInfo'), '');
  
  RichEditViewer := TRichEditViewer.Create(AuthorPage);
  RichEditViewer.Parent := AuthorPage.Surface;
  RichEditViewer.Left := 0;
  RichEditViewer.Top := 0;
  RichEditViewer.Width := AuthorPage.SurfaceWidth;
  RichEditViewer.Height := AuthorPage.SurfaceHeight;
  RichEditViewer.ReadOnly := True;
  RichEditViewer.ScrollBars := ssVertical;
  RichEditViewer.UseRichEdit := True;
  RichEditViewer.Color := $F5F5F5;
  RichEditViewer.BorderStyle := bsNone;

  RichEditViewer.Lines.Add('exe 制作者: shanhe（山河）Github: shanheinfo');
  RichEditViewer.Lines.Add('主版本制作者: XingQiPan（星棋盘）Github: XingQiPan');
  RichEditViewer.Lines.Add('当前应用版本: 1.4.0');
  RichEditViewer.Lines.Add('');
  RichEditViewer.Lines.Add('星卡写作软件产品描述:');
  RichEditViewer.Lines.Add('本应用是一款由山河(shanhe)开发基于Go的桌面应用，由原始项目星棋盘(XingQiPan)Vue 3 + Vite 构建的程序重新制作而成，');
  RichEditViewer.Lines.Add('是一个现代化的、功能丰富的提示词编辑和管理系统，该系统允许用户创建、');
  RichEditViewer.Lines.Add('编辑和管理 AI 提示词，支持场景管理、文本卡片和智能工作流。');
  RichEditViewer.Lines.Add('本项目Github地址: https://github.com/XingQiPan/card-creation 本程序在该项目的go分支下');

  // 创建程序运行截图页面
  ScreenshotPage := CreateCustomPage(AuthorPage.ID, CustomMessage('Screenshot'), '');
  with ScreenshotPage.Surface do
  begin
    Image := TBitmapImage.Create(ScreenshotPage);
    Image.Parent := ScreenshotPage.Surface;
    Image.Left := 10;
    Image.Top := 10;
    Image.Width := ScreenshotPage.SurfaceWidth - 20;
    Image.Height := ScreenshotPage.SurfaceHeight - 20;
    Image.Bitmap.LoadFromFile(ImagePath);
  end;

  // 创建问题提交页面
  IssuePage := CreateCustomPage(ScreenshotPage.ID, CustomMessage('IssueSubmission'), '');
  
  RichEditViewer := TRichEditViewer.Create(IssuePage);
  RichEditViewer.Parent := IssuePage.Surface;
  RichEditViewer.Left := 0;
  RichEditViewer.Top := 0;
  RichEditViewer.Width := IssuePage.SurfaceWidth;
  RichEditViewer.Height := IssuePage.SurfaceHeight;
  RichEditViewer.ReadOnly := True;
  RichEditViewer.ScrollBars := ssVertical;
  RichEditViewer.UseRichEdit := True;
  RichEditViewer.Color := $F5F5F5;
  RichEditViewer.BorderStyle := bsNone;

  RichEditViewer.Lines.Add('问题反馈渠道:');
  RichEditViewer.Lines.Add('1. QQ官方群');
  RichEditViewer.Lines.Add('群号: 1028368820');
  RichEditViewer.Lines.Add('2. Github Issues');
  RichEditViewer.Lines.Add('项目地址：https://github.com/XingQiPan/card-creation');
  RichEditViewer.Lines.Add('您可以在项目的 Issues 页面提交问题报告或功能建议');
  RichEditViewer.Lines.Add('3. 提交问题时请说明:');
  RichEditViewer.Lines.Add('- 使用的软件版本');
  RichEditViewer.Lines.Add('- 问题的详细描述');
  RichEditViewer.Lines.Add('- 复现步骤（如果适用）');
  RichEditViewer.Lines.Add('- 错误信息或截图（如果有）');

  // 创建更新日志页面
  UpdateLogPage := CreateCustomPage(IssuePage.ID, CustomMessage('UpdateLog'), '');
  
  // 使用 TRichEditViewer 创建可滚动的文本区域
  RichEditViewer := TRichEditViewer.Create(UpdateLogPage);
  RichEditViewer.Parent := UpdateLogPage.Surface;
  RichEditViewer.Left := 0;
  RichEditViewer.Top := 0;
  RichEditViewer.Width := UpdateLogPage.SurfaceWidth;
  RichEditViewer.Height := UpdateLogPage.SurfaceHeight;
  RichEditViewer.ReadOnly := True;
  RichEditViewer.ScrollBars := ssVertical;
  RichEditViewer.UseRichEdit := True;
  
  RichEditViewer.Lines.Add('v1.5.0:');
  RichEditViewer.Lines.Add('- 修复了已知bug');
  RichEditViewer.Lines.Add('- 同步了最新版本前端');
  RichEditViewer.Lines.Add('- 将在线更新暂时废除，等新计划');
  RichEditViewer.Lines.Add('- 修改了安装流程');
  RichEditViewer.Lines.Add('- 增加了错误日记记录');
  RichEditViewer.Lines.Add('');
  RichEditViewer.Lines.Add('v1.4.0:');
  RichEditViewer.Lines.Add('- 在线更新');
  RichEditViewer.Lines.Add('- 更新了最新前端版本');
  RichEditViewer.Lines.Add('');
  RichEditViewer.Lines.Add('v1.3.0:');
  RichEditViewer.Lines.Add('- 模块化安装');
  RichEditViewer.Lines.Add('- 修复已知bug');
  RichEditViewer.Lines.Add('');
  RichEditViewer.Lines.Add('v1.2.0:');
  RichEditViewer.Lines.Add('- 添加自动更新功能');
  RichEditViewer.Lines.Add('- 修复已知bug');
  RichEditViewer.Lines.Add('- 优化部分功能');
  RichEditViewer.Lines.Add('');
  RichEditViewer.Lines.Add('v1.1.0:');
  RichEditViewer.Lines.Add('- 添加自动版本检查和更新提示');
  RichEditViewer.Lines.Add('- 迁移了服务端服务到本地');
  RichEditViewer.Lines.Add('- 使用本地JSON文件存储数据，无需依赖外部数据库');
  RichEditViewer.Lines.Add('');
  RichEditViewer.Lines.Add('v1.0.0:');
  RichEditViewer.Lines.Add('- 初始版本，实现基本功能');

  // 美化 RichEditViewer
  RichEditViewer.Font.Name := 'Microsoft YaHei UI';
  RichEditViewer.Font.Size := 9;
  RichEditViewer.Color := $F5F5F5;
  RichEditViewer.BorderStyle := bsNone;
  
  // 添加内边距
  RichEditViewer.Left := 20;
  RichEditViewer.Top := 20;
  RichEditViewer.Width := WizardForm.InnerPage.Width - 40;
  RichEditViewer.Height := WizardForm.InnerPage.Height - 40;
end;