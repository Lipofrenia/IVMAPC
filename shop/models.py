import itertools

from django.contrib.auth.models import User
from django.db import models
from django.urls import reverse
from django.utils.text import slugify


class Category(models.Model):
    name = models.CharField("Название", max_length=100)
    slug = models.SlugField("URL-имя", max_length=120, unique=True, blank=True)
    tag = models.CharField(
        "Тег", max_length=50, blank=True, help_text="Например: Периферия, Сборки"
    )
    title = models.CharField("Заголовок на плитке", max_length=100, blank=True)
    subtitle = models.CharField("Подзаголовок", max_length=200, blank=True)
    page_subtitle = models.CharField(
        "Подзаголовок страницы", max_length=200, blank=True
    )
    image = models.ImageField(
        "Фоновое изображение", upload_to="categories/", blank=True
    )
    order = models.PositiveIntegerField("Порядок", default=0)
    is_active = models.BooleanField("Активна", default=True)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Категория"
        verbose_name_plural = "Категории"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name, allow_unicode=True)
            if not base_slug:
                base_slug = "category"
            slug = base_slug
            for i in itertools.count(1):
                if not Category.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                    break
                slug = f"{base_slug}-{i}"
            self.slug = slug
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse("shop:category", kwargs={"slug": self.slug})


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="products",
        verbose_name="Категория",
    )
    name = models.CharField("Название", max_length=200)
    slug = models.SlugField("URL-имя", max_length=220, unique=True, blank=True)
    model_name = models.CharField("Модель", max_length=100, blank=True)
    short_description = models.TextField("Краткое описание", blank=True)
    full_description = models.TextField("Полное описание", blank=True)
    price = models.DecimalField("Цена", max_digits=10, decimal_places=0)
    stock_quantity = models.PositiveIntegerField("Остаток", default=0)
    is_available = models.BooleanField("В наличии", default=True)
    is_featured = models.BooleanField(
        "На главной", default=False, help_text="Показывать на главной странице"
    )
    specs_short = models.CharField(
        "Краткие характеристики",
        max_length=300,
        blank=True,
        help_text="Для карточки каталога, например: Ryzen 7 / RTX 4070 / 32 GB",
    )
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Товар"
        verbose_name_plural = "Товары"

    def __str__(self):
        return f"{self.name} {self.model_name}"

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(f"{self.name}-{self.model_name}", allow_unicode=True)
            if not base_slug:
                base_slug = "product"
            slug = base_slug
            for i in itertools.count(1):
                if not Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                    break
                slug = f"{base_slug}-{i}"
            self.slug = slug
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return reverse(
            "shop:product",
            kwargs={
                "cat_slug": self.category.slug,
                "prod_slug": self.slug,
            },
        )

    @property
    def main_image(self):
        img = self.images.filter(is_main=True).first()
        if not img:
            img = self.images.first()
        return img

    @property
    def formatted_price(self):
        return f"{int(self.price):,}".replace(",", " ") + " ₽"

    @property
    def stock_status(self):
        if self.stock_quantity > 0 and self.is_available:
            return "В наличии"
        return "Нет в наличии"


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images", verbose_name="Товар"
    )
    image = models.ImageField("Изображение", upload_to="products/")
    alt_text = models.CharField("Alt-текст", max_length=200, blank=True)
    is_main = models.BooleanField("Главное фото", default=False)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Фото товара"
        verbose_name_plural = "Фото товаров"

    def __str__(self):
        return f"Фото {self.order} — {self.product}"


class SpecGroup(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="spec_groups",
        verbose_name="Товар",
    )
    name = models.CharField(
        "Группа", max_length=100, help_text="Процессор, Видеокарта, Память..."
    )
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Группа характеристик"
        verbose_name_plural = "Группы характеристик"

    def __str__(self):
        return f"{self.name} — {self.product}"


class ProductSpec(models.Model):
    group = models.ForeignKey(
        SpecGroup, on_delete=models.CASCADE, related_name="specs", verbose_name="Группа"
    )
    label = models.CharField("Параметр", max_length=100)
    value = models.CharField("Значение", max_length=200)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Характеристика"
        verbose_name_plural = "Характеристики"

    def __str__(self):
        return f"{self.label}: {self.value}"


class QuickSpec(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="quick_specs",
        verbose_name="Товар",
    )
    label = models.CharField("Параметр", max_length=100)
    value = models.CharField("Значение", max_length=200)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Быстрая характеристика"
        verbose_name_plural = "Быстрые характеристики"

    def __str__(self):
        return f"{self.label}: {self.value}"


class SliderSlide(models.Model):
    title = models.CharField("Название", max_length=200, blank=True)
    image = models.ImageField("Изображение", upload_to="slider/")
    link = models.URLField("Ссылка", blank=True, help_text="Куда ведёт клик по слайду")
    is_active = models.BooleanField("Активен", default=True)
    order = models.PositiveIntegerField("Порядок", default=0)

    class Meta:
        ordering = ["order"]
        verbose_name = "Слайд"
        verbose_name_plural = "Слайды"

    def __str__(self):
        return self.title or f"Слайд #{self.order}"


class CartItem(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name="Пользователь",
        null=True,
        blank=True,
    )
    session_key = models.CharField("Сессия", max_length=40, blank=True)
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="cart_items",
        verbose_name="Товар",
    )
    quantity = models.PositiveIntegerField("Количество", default=1)
    added_at = models.DateTimeField("Добавлен", auto_now_add=True)

    class Meta:
        verbose_name = "Позиция корзины"
        verbose_name_plural = "Позиции корзины"
        unique_together = [
            ("user", "product"),
        ]

    def __str__(self):
        return f"{self.product} × {self.quantity}"

    @property
    def total_price(self):
        return self.product.price * self.quantity

    @property
    def formatted_total(self):
        return f"{int(self.total_price):,}".replace(",", " ") + " ₽"


class Order(models.Model):
    STATUS_CHOICES = [
        ("new", "Новый"),
        ("processing", "В обработке"),
        ("shipped", "Отправлен"),
        ("delivered", "Доставлен"),
        ("cancelled", "Отменён"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name="Пользователь",
    )
    status = models.CharField(
        "Статус", max_length=20, choices=STATUS_CHOICES, default="new"
    )
    total_amount = models.DecimalField(
        "Сумма", max_digits=12, decimal_places=0, default=0
    )
    created_at = models.DateTimeField("Создан", auto_now_add=True)
    updated_at = models.DateTimeField("Обновлён", auto_now=True)
    comment = models.TextField("Комментарий", blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"

    def __str__(self):
        return f"Заказ #{self.pk} — {self.get_status_display()}"

    @property
    def formatted_total(self):
        return f"{int(self.total_amount):,}".replace(",", " ") + " ₽"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items", verbose_name="Заказ"
    )
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, verbose_name="Товар"
    )
    product_name = models.CharField("Название (на момент заказа)", max_length=200)
    price = models.DecimalField("Цена", max_digits=10, decimal_places=0)
    quantity = models.PositiveIntegerField("Количество", default=1)

    class Meta:
        verbose_name = "Позиция заказа"
        verbose_name_plural = "Позиции заказа"

    def __str__(self):
        return f"{self.product_name} × {self.quantity}"

    @property
    def total_price(self):
        return self.price * self.quantity


class UserProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name="Пользователь",
    )
    phone = models.CharField("Телефон", max_length=20, blank=True)
    photo = models.ImageField("Фото", upload_to="profiles/", blank=True)

    class Meta:
        verbose_name = "Профиль"
        verbose_name_plural = "Профили"

    def __str__(self):
        return f"Профиль {self.user.username}"
