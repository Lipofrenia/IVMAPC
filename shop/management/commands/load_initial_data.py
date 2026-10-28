import os
import shutil

from django.conf import settings
from django.core.management.base import BaseCommand

from shop.models import (
    Category,
    Product,
    ProductImage,
    ProductSpec,
    QuickSpec,
    SliderSlide,
    SpecGroup,
)


class Command(BaseCommand):
    help = "Загружает начальные данные (категории, товары, слайды) из существующего фронтенда"

    def handle(self, *args, **options):
        self.stdout.write("Загрузка начальных данных...")

        # ── Слайды ────────────────────────────────────────
        slider_dir = os.path.join(settings.MEDIA_ROOT, "slider")
        os.makedirs(slider_dir, exist_ok=True)
        static_slider = os.path.join(settings.BASE_DIR, "static", "images", "slider")
        if os.path.isdir(static_slider):
            for fname in os.listdir(static_slider):
                src = os.path.join(static_slider, fname)
                dst = os.path.join(slider_dir, fname)
                if not os.path.exists(dst):
                    shutil.copy2(src, dst)

        slide_files = [
            "Slide 1.png",
            "Slide 2.png",
            "Slide 3.png",
            "Slide 4.png",
            "Slide 5.png",
        ]
        for i, fname in enumerate(slide_files, 1):
            fpath = os.path.join(slider_dir, fname)
            if os.path.exists(fpath):
                SliderSlide.objects.get_or_create(
                    order=i,
                    defaults={
                        "title": f"Слайд {i}",
                        "image": f"slider/{fname}",
                        "is_active": True,
                    },
                )
                self.stdout.write(f"  [OK] Слайд {i}")

        # ── Категории ────────────────────────────────────
        categories_data = [
            {
                "name": "Игровые компьютеры",
                "slug": "computers",
                "tag": "Сборки",
                "title": "Готовые игровые ПК",
                "subtitle": "Мощные конфигурации для игр и стриминга",
                "page_subtitle": "Готовые сборки для игр, стриминга и рабочих задач",
                "order": 1,
            },
            {
                "name": "Клавиатуры",
                "slug": "keyboards",
                "tag": "Периферия",
                "title": "Клавиатуры",
                "subtitle": "Механика и мембрана",
                "page_subtitle": "Механические и мембранные клавиатуры для любых задач",
                "order": 2,
            },
            {
                "name": "Мониторы",
                "slug": "monitors",
                "tag": "Периферия",
                "title": "Мониторы",
                "subtitle": "От 24 до 34 дюймов",
                "page_subtitle": "Игровые и офисные мониторы",
                "order": 3,
            },
            {
                "name": "Наушники",
                "slug": "headphones",
                "tag": "Периферия",
                "title": "Наушники",
                "subtitle": "Погружение в звук",
                "page_subtitle": "Игровые и студийные наушники",
                "order": 4,
            },
            {
                "name": "Мышки",
                "slug": "mice",
                "tag": "Периферия",
                "title": "Мышки",
                "subtitle": "Контроль в каждом клике",
                "page_subtitle": "Игровые и офисные мышки",
                "order": 5,
            },
            {
                "name": "Микрофоны",
                "slug": "microphones",
                "tag": "Периферия",
                "title": "Микрофоны",
                "subtitle": "Чистый голос",
                "page_subtitle": "Конденсаторные и динамические микрофоны",
                "order": 6,
            },
        ]

        for cat_data in categories_data:
            cat, created = Category.objects.get_or_create(
                slug=cat_data["slug"],
                defaults=cat_data,
            )
            status = "создана" if created else "уже существует"
            self.stdout.write(f'  [OK] Категория "{cat.name}" — {status}')

        # ── Товары ────────────────────────────────────────
        computers = Category.objects.get(slug="computers")
        monitors = Category.objects.get(slug="monitors")
        keyboards = Category.objects.get(slug="keyboards")

        # Копирование изображений из static в media
        products_media = os.path.join(settings.MEDIA_ROOT, "products")
        os.makedirs(products_media, exist_ok=True)
        static_cards = os.path.join(settings.BASE_DIR, "static", "images", "cards")
        for fname in os.listdir(static_cards):
            src = os.path.join(static_cards, fname)
            dst = os.path.join(products_media, fname)
            if not os.path.exists(dst):
                shutil.copy2(src, dst)

        products_data = [
            {
                "category": computers,
                "name": "Игровой компьютер",
                "model_name": "CORE X1",
                "slug": "core-x1",
                "price": 81900,
                "stock_quantity": 12,
                "is_featured": True,
                "specs_short": "Intel Core i5-12400F / RTX 4060 / 16 GB / 512 GB SSD",
                "short_description": "Готовая игровая сборка на базе Intel Core i5 12-го поколения с видеокартой NVIDIA GeForce RTX 4060. Идеальный выбор для комфортной игры в 1080p и 1440p.",
                "full_description": "CORE X1 — это готовая игровая система, собранная нашими специалистами с использованием только проверенных комплектующих ведущих мировых производителей.\n\nПроцессор Intel Core i5-12400F обеспечивает плавную работу в современных играх, а видеокарта NVIDIA GeForce RTX 4060 позволяет запускать игры с трассировкой лучей на высоких настройках графики в разрешении Full HD и QHD.\n\nСтильный корпус с RGB-подсветкой, закалённое стекло на боковой панели и продуманная система вентиляции позволяют поддерживать оптимальный температурный режим даже при длительных игровых сессиях.\n\nСистема полностью готова к использованию — достаточно подключить монитор, клавиатуру и мышь. Windows 11 Home уже установлена и активирована.",
                "image": "pk1.png",
            },
            {
                "category": computers,
                "name": "Игровой компьютер",
                "model_name": "CORE X2",
                "slug": "core-x2",
                "price": 139900,
                "stock_quantity": 8,
                "is_featured": True,
                "specs_short": "Core i7 14700 / RTX 4070 Super / 32 GB / 1 TB SSD",
                "short_description": "Мощная игровая система на Intel Core i7 14-го поколения с RTX 4070 Super.",
                "image": "pk1.png",
            },
            {
                "category": computers,
                "name": "Игровой компьютер",
                "model_name": "CORE X3",
                "slug": "core-x3",
                "price": 184900,
                "stock_quantity": 5,
                "is_featured": True,
                "specs_short": "Ryzen 9 7900 / RTX 4080 / 32 GB / 2 TB SSD",
                "short_description": "Топовая игровая система на AMD Ryzen 9 с RTX 4080.",
                "image": "pk1.png",
            },
            {
                "category": monitors,
                "name": "Монитор",
                "model_name": "CORE View 27",
                "slug": "core-view-27",
                "price": 62400,
                "stock_quantity": 15,
                "is_featured": True,
                "specs_short": '27", IPS, 165 Гц, 2560x1440',
                "short_description": "Игровой монитор 27 дюймов с IPS матрицей и частотой 165 Гц.",
                "image": "monik1.png",
            },
            {
                "category": monitors,
                "name": "Монитор",
                "model_name": "CORE View 24",
                "slug": "core-view-24",
                "price": 34900,
                "stock_quantity": 20,
                "is_featured": True,
                "specs_short": '24", IPS, 144 Гц, 1920x1080',
                "short_description": "Компактный игровой монитор с IPS матрицей.",
                "image": "monik1.png",
            },
            {
                "category": monitors,
                "name": "Монитор",
                "model_name": "CORE Ultra 32",
                "slug": "core-ultra-32",
                "price": 89900,
                "stock_quantity": 7,
                "is_featured": True,
                "specs_short": '32", VA, 240 Гц, 2560x1440',
                "short_description": "Профессиональный игровой монитор с 240 Гц.",
                "image": "monik1.png",
            },
            {
                "category": keyboards,
                "name": "Клавиатура",
                "model_name": "CORE Keys MX",
                "slug": "core-keys-mx",
                "price": 8900,
                "stock_quantity": 30,
                "is_featured": True,
                "specs_short": "Механическая, Cherry MX Red, RGB",
                "short_description": "Механическая клавиатура с переключателями Cherry MX Red.",
                "image": "klava1.png",
            },
            {
                "category": keyboards,
                "name": "Клавиатура",
                "model_name": "CORE Keys Pro",
                "slug": "core-keys-pro",
                "price": 12900,
                "stock_quantity": 18,
                "is_featured": True,
                "specs_short": "Механическая, Cherry MX Brown, RGB, алюминий",
                "short_description": "Премиальная механическая клавиатура в алюминиевом корпусе.",
                "image": "klava1.png",
            },
            {
                "category": keyboards,
                "name": "Клавиатура",
                "model_name": "CORE Keys Lite",
                "slug": "core-keys-lite",
                "price": 4900,
                "stock_quantity": 50,
                "is_featured": True,
                "specs_short": "Мембранная, подсветка, тихие клавиши",
                "short_description": "Доступная мембранная клавиатура с подсветкой.",
                "image": "klava1.png",
            },
        ]

        for pdata in products_data:
            img_name = pdata.pop("image")
            cat = pdata.pop("category")
            product, created = Product.objects.get_or_create(
                slug=pdata["slug"],
                defaults={**pdata, "category": cat},
            )
            if created:
                ProductImage.objects.create(
                    product=product,
                    image=f"products/{img_name}",
                    alt_text=f"{product.name} {product.model_name}",
                    is_main=True,
                    order=1,
                )
            status = "создан" if created else "уже существует"
            self.stdout.write(f'  [OK] Товар "{product}" — {status}')

        # ── Характеристики для CORE X1 ────────────────────
        core_x1 = Product.objects.filter(slug="core-x1").first()
        if core_x1 and not core_x1.quick_specs.exists():
            quick_specs = [
                ("Процессор", "Intel Core i5-12400F"),
                ("Видеокарта", "NVIDIA GeForce RTX 4060 8 ГБ"),
                ("ОЗУ", "16 ГБ DDR5"),
                ("Накопитель", "SSD 512 ГБ NVMe"),
                ("ОС", "Windows 11 Home"),
            ]
            for i, (label, value) in enumerate(quick_specs, 1):
                QuickSpec.objects.create(
                    product=core_x1, label=label, value=value, order=i
                )

            spec_groups_data = [
                (
                    "Процессор",
                    [
                        ("Модель", "Intel Core i5-12400F"),
                        ("Количество ядер", "6 (12 потоков)"),
                        ("Тактовая частота", "до 4.4 ГГц (Turbo Boost)"),
                    ],
                ),
                (
                    "Видеокарта",
                    [
                        ("Модель", "NVIDIA GeForce RTX 4060"),
                        ("Объём VRAM", "8 ГБ GDDR6"),
                        ("Поддержка DLSS", "DLSS 3.0"),
                    ],
                ),
                (
                    "Память",
                    [
                        ("Объём ОЗУ", "16 ГБ"),
                        ("Тип памяти", "DDR5-4800"),
                    ],
                ),
                (
                    "Накопитель",
                    [
                        ("Тип", "SSD NVMe M.2"),
                        ("Объём", "512 ГБ"),
                    ],
                ),
                (
                    "Система",
                    [
                        ("Операционная система", "Windows 11 Home (лицензия)"),
                        ("Материнская плата", "MSI PRO B660M-A DDR5"),
                        ("Блок питания", "600 Вт, 80+ Bronze"),
                        ("Корпус", "Mid-Tower, RGB, боковое стекло"),
                    ],
                ),
                (
                    "Габариты",
                    [
                        ("Размер корпуса", "395 × 200 × 420 мм"),
                        ("Масса", "8.5 кг"),
                    ],
                ),
            ]
            for gi, (group_name, specs) in enumerate(spec_groups_data, 1):
                group = SpecGroup.objects.create(
                    product=core_x1, name=group_name, order=gi
                )
                for si, (label, value) in enumerate(specs, 1):
                    ProductSpec.objects.create(
                        group=group, label=label, value=value, order=si
                    )

            self.stdout.write("  [OK] Характеристики CORE X1")

        self.stdout.write(self.style.SUCCESS("\n[OK] Начальные данные загружены!"))
