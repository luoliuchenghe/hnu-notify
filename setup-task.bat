@echo off
chcp 65001 >nul
echo ================================================
echo 湖南大学通知推送 - 设置 Windows 定时任务
echo ================================================
echo.

:: 删除旧任务（如果存在）
schtasks /delete /tn "HNU_Notify_Daily" /f >nul 2>&1

:: 创建新任务：每天早上 8:00 运行
schtasks /create ^
    /tn "HNU_Notify_Daily" ^
    /tr "C:\Users\17389\hnu-notify\run-daily.bat" ^
    /sc daily ^
    /st 08:00 ^
    /f ^
    /ru "SYSTEM"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 定时任务创建成功！
    echo    任务名称: HNU_Notify_Daily
    echo    执行时间: 每天 08:00
    echo    执行脚本: C:\Users\17389\hnu-notify\run-daily.bat
) else (
    echo.
    echo ❌ 定时任务创建失败，请以管理员身份运行此脚本
)

echo.
echo 查看任务: schtasks /query /tn HNU_Notify_Daily
echo 手动运行: schtasks /run /tn HNU_Notify_Daily
echo 删除任务: schtasks /delete /tn HNU_Notify_Daily /f
echo.
pause
