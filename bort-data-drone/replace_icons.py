#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для замены PNG иконок в папке src-tauri/icons на drone.png
Копирует изображение drone.png в оригинальном размере для всех иконок
"""

import os
import shutil
from PIL import Image
from pathlib import Path

def get_icon_size_from_filename(filename):
    """Извлекает размер иконки из имени файла"""
    # Словарь соответствия имен файлов и размеров
    size_mapping = {
        '32x32.png': (32, 32),
        '128x128.png': (128, 128),
        '128x128@2x.png': (256, 256),  # @2x означает удвоенный размер
        'icon.png': (512, 512),  # Стандартный размер для основной иконки
        'Square30x30Logo.png': (30, 30),
        'Square44x44Logo.png': (44, 44),
        'Square71x71Logo.png': (71, 71),
        'Square89x89Logo.png': (89, 89),
        'Square107x107Logo.png': (107, 107),
        'Square142x142Logo.png': (142, 142),
        'Square150x150Logo.png': (150, 150),
        'Square284x284Logo.png': (284, 284),
        'Square310x310Logo.png': (310, 310),
        'StoreLogo.png': (50, 50)
    }
    
    return size_mapping.get(filename, (128, 128))  # По умолчанию 128x128

def copy_original_image(source_image_path, target_path):
    """Копирует изображение в оригинальном размере"""
    try:
        # Копируем файл напрямую, сохраняя оригинальный размер
        shutil.copy2(source_image_path, target_path)
        
        # Получаем размер для отображения в логе
        with Image.open(target_path) as img:
            width, height = img.size
            print(f"✓ Скопирована иконка: {target_path} ({width}x{height} - оригинальный размер)")
            
    except Exception as e:
        print(f"✗ Ошибка при копировании {target_path}: {e}")

def backup_original_icons(icons_dir):
    """Создает резервную копию оригинальных иконок"""
    backup_dir = icons_dir / "backup_original"
    backup_dir.mkdir(exist_ok=True)
    
    print(f"Создание резервной копии в {backup_dir}...")
    
    for png_file in icons_dir.glob("*.png"):
        if png_file.name != "backup_original":  # Исключаем папку бэкапа
            backup_path = backup_dir / png_file.name
            if not backup_path.exists():  # Не перезаписываем существующие бэкапы
                shutil.copy2(png_file, backup_path)
                print(f"  Скопирован: {png_file.name}")

def create_ico_file(source_image_path, ico_path):
    """Создает ICO файл из оригинального изображения"""
    try:
        with Image.open(source_image_path) as img:
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Сохраняем как ICO в оригинальном размере
            img.save(ico_path, format='ICO')
            width, height = img.size
            print(f"✓ Создан ICO файл: {ico_path} ({width}x{height} - оригинальный размер)")
            
    except Exception as e:
        print(f"✗ Ошибка при создании ICO файла {ico_path}: {e}")

def replace_icons():
    """Основная функция замены иконок"""
    # Пути к файлам
    drone_image_path = Path("drone.png")
    icons_dir = Path("src-tauri/icons")
    
    # Проверяем существование файлов
    if not drone_image_path.exists():
        print(f"✗ Ошибка: Файл {drone_image_path} не найден!")
        return False
    
    if not icons_dir.exists():
        print(f"✗ Ошибка: Папка {icons_dir} не найдена!")
        return False
    
    print(f"Исходное изображение: {drone_image_path}")
    print(f"Папка с иконками: {icons_dir}")
    print("-" * 50)
    
    # Создаем резервную копию
    backup_original_icons(icons_dir)
    print("-" * 50)
    
    # Получаем список PNG файлов в папке иконок
    png_files = list(icons_dir.glob("*.png"))
    
    if not png_files:
        print("✗ PNG файлы в папке иконок не найдены!")
        return False
    
    print(f"Найдено PNG файлов для замены: {len(png_files)}")
    print("-" * 50)
    
    # Заменяем каждую PNG иконку (копируем в оригинальном размере)
    success_count = 0
    for png_file in png_files:
        copy_original_image(drone_image_path, png_file)
        success_count += 1
    
    # Создаем ICO файл
    ico_path = icons_dir / "icon.ico"
    create_ico_file(drone_image_path, ico_path)
    success_count += 1
    
    print("-" * 50)
    print(f"✓ Замена завершена! Обработано файлов: {success_count}")
    print(f"Резервные копии сохранены в: {icons_dir}/backup_original")
    
    return True

if __name__ == "__main__":
    print("=== Замена PNG иконок на drone.png ===")
    print()
    
    try:
        # Проверяем наличие библиотеки Pillow
        import PIL
        print("✓ Библиотека Pillow найдена")
    except ImportError:
        print("✗ Ошибка: Необходимо установить библиотеку Pillow")
        print("Выполните команду: pip install Pillow")
        exit(1)
    
    # Выполняем замену
    if replace_icons():
        print("\n🎉 Все иконки успешно заменены!")
        print("Теперь вы можете пересобрать проект командой: yarn tauri:generate")
    else:
        print("\n❌ Замена иконок завершилась с ошибками")
        exit(1)
