@echo off
echo ========================================
echo Очистка кеша иконок Windows
echo ========================================

echo Остановка процесса explorer.exe...
taskkill /f /im explorer.exe

echo Очистка кеша иконок...
cd /d %userprofile%\AppData\Local
del IconCache.db /a
del /q Microsoft\Windows\Explorer\iconcache*

echo Очистка кеша миниатюр...
del /q Microsoft\Windows\Explorer\thumbcache*

echo Перезапуск explorer.exe...
start explorer.exe

echo ========================================
echo Кеш иконок очищен!
echo Теперь попробуйте запустить новое приложение
echo ========================================
pause
