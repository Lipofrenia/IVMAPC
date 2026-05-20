from django.contrib import admin
from django.utils.html import format_html

from .models import (
    CartItem,
    Category,
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductSpec,
    QuickSpec,
    SliderSlide,
    SpecGroup,
    UserProfile,
)

# ── Инлайны ──────────────────────────────────────────────────


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image", "alt_text", "is_main", "order", "preview")
    readonly_fields = ("preview",)

    @admin.display(description="Превью")
    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" height="60" />', obj.image.url)
        return "—"


class ProductSpecInline(admin.TabularInline):
    model = ProductSpec
    extra = 2
    fields = ("label", "value", "order")


class SpecGroupInline(admin.StackedInline):
    model = SpecGroup
    extra = 0
    fields = ("name", "order")
    show_change_link = True


class QuickSpecInline(admin.TabularInline):
    model = QuickSpec
    extra = 3
    fields = ("label", "value", "order")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "product_name", "price", "quantity")


# ── Category ─────────────────────────────────────────────────


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "tag", "order", "is_active", "product_count")
    list_editable = ("order", "is_active")
    prepopulated_fields = {"slug": ("name",)}
    search_fields = ("name",)

    @admin.display(description="Товаров")
    def product_count(self, obj):
        return obj.products.count()


# ── Product ──────────────────────────────────────────────────


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "model_name",
        "category",
        "formatted_price",
        "stock_quantity",
        "is_available",
        "is_featured",
    )
    list_filter = ("category", "is_available", "is_featured")
    list_editable = ("stock_quantity", "is_available", "is_featured")
    search_fields = ("name", "model_name")
    prepopulated_fields = {"slug": ("name", "model_name")}
    inlines = [ProductImageInline, QuickSpecInline, SpecGroupInline]
    fieldsets = (
        (None, {"fields": ("category", "name", "model_name", "slug")}),
        (
            "Цена и наличие",
            {"fields": ("price", "stock_quantity", "is_available", "is_featured")},
        ),
        (
            "Описания",
            {"fields": ("specs_short", "short_description", "full_description")},
        ),
    )


# ── SpecGroup (отдельная страница для редактирования спеков) ─


@admin.register(SpecGroup)
class SpecGroupAdmin(admin.ModelAdmin):
    list_display = ("name", "product", "order")
    list_filter = ("product",)
    inlines = [ProductSpecInline]


# ── SliderSlide ──────────────────────────────────────────────


@admin.register(SliderSlide)
class SliderSlideAdmin(admin.ModelAdmin):
    list_display = ("title", "order", "is_active", "preview")
    list_editable = ("order", "is_active")

    @admin.display(description="Превью")
    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" height="60" />', obj.image.url)
        return "—"


# ── Order ────────────────────────────────────────────────────


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("__str__", "user", "status", "formatted_total", "created_at")
    list_filter = ("status", "created_at")
    list_editable = ("status",)
    inlines = [OrderItemInline]
    readonly_fields = ("total_amount", "created_at", "updated_at")


# ── UserProfile ──────────────────────────────────────────────


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone")
    search_fields = ("user__username", "user__email", "phone")


# ── CartItem (read-only в админке, для отладки) ──────────────


@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "quantity", "added_at")
    list_filter = ("added_at",)
