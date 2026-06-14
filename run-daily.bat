@echo off
chcp 65001 >nul
echo ================================================
echo 湖南大学通知推送程序 - 每日定时运行
echo %date% %time%
echo ================================================

cd /d "C:\Users\17389\hnu-notify"
"C:\Program Files\nodejs\node.exe" index.js >> run.log 2>&1

echo 完成！
