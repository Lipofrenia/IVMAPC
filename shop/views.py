import json

from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .models import (
    CartItem,
    Category,
    Order,
    OrderItem,
    Product,
    SliderSlide,
    UserProfile,
)

# ── Главная ──────────────────────────────────────────────────


def index(request):
    slides = SliderSlide.objects.filter(is_active=True)
    categories = Category.objects.filter(is_active=True)

    featured_sections = []
    for cat in categories:
        products = cat.products.filter(is_available=True, is_featured=True)[:3]
        if products.exists():
            featured_sections.append(
                {
                    "category": cat,
                    "products": products,
                }
            )

    return render(
        request,
        "index.html",
        {
            "slides": slides,
            "featured_sections": featured_sections,
        },
    )


# ── Каталог ──────────────────────────────────────────────────


def catalog(request):
    categories = Category.objects.filter(is_active=True)
    return render(
        request,
        "catalog.html",
        {
            "categories": categories,
        },
    )


# ── Категория (список товаров) ───────────────────────────────


def category_detail(request, slug):
    category = get_object_or_404(Category, slug=slug, is_active=True)
    products = category.products.filter(is_available=True)

    sort = request.GET.get("sort", "popular")
    if sort == "price_asc":
        products = products.order_by("price")
    elif sort == "price_desc":
        products = products.order_by("-price")
    elif sort == "new":
        products = products.order_by("-created_at")

    price_min = request.GET.get("price_min")
    price_max = request.GET.get("price_max")
    if price_min:
        try:
            products = products.filter(price__gte=int(price_min))
        except ValueError:
            pass
    if price_max:
        try:
            products = products.filter(price__lte=int(price_max))
        except ValueError:
            pass

    return render(
        request,
        "category.html",
        {
            "category": category,
            "products": products,
            "current_sort": sort,
            "price_min": price_min or "",
            "price_max": price_max or "",
        },
    )


# ── Детальная страница товара ────────────────────────────────


def product_detail(request, cat_slug, prod_slug):
    product = get_object_or_404(
        Product,
        slug=prod_slug,
        category__slug=cat_slug,
        is_available=True,
    )
    images = product.images.all()
    quick_specs = product.quick_specs.all()
    spec_groups = product.spec_groups.prefetch_related("specs").all()

    return render(
        request,
        "product.html",
        {
            "product": product,
            "images": images,
            "quick_specs": quick_specs,
            "spec_groups": spec_groups,
        },
    )


# ── Поиск ────────────────────────────────────────────────────


def search(request):
    query = request.GET.get("q", "").strip()
    products = []
    if query:
        products = Product.objects.filter(
            Q(name__icontains=query)
            | Q(model_name__icontains=query)
            | Q(short_description__icontains=query)
            | Q(specs_short__icontains=query),
            is_available=True,
        )

    return render(
        request,
        "search.html",
        {
            "query": query,
            "products": products,
        },
    )


# ── Авторизация ──────────────────────────────────────────────


def login_view(request):
    if request.user.is_authenticated:
        return redirect("shop:profile")

    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")

        try:
            user_obj = User.objects.get(email=email)
            username = user_obj.username
        except User.DoesNotExist:
            username = None

        if username:
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                return redirect("shop:profile")

        messages.error(request, "Неверный email или пароль.")

    return render(request, "auth/login.html")


def register_view(request):
    if request.user.is_authenticated:
        return redirect("shop:profile")

    if request.method == "POST":
        email = request.POST.get("email", "").strip()
        password = request.POST.get("password", "")
        password_confirm = request.POST.get("password_confirm", "")

        if not email or not password:
            messages.error(request, "Заполните все поля.")
        elif password != password_confirm:
            messages.error(request, "Пароли не совпадают.")
        elif User.objects.filter(email=email).exists():
            messages.error(request, "Пользователь с таким email уже существует.")
        elif len(password) < 6:
            messages.error(request, "Пароль должен содержать минимум 6 символов.")
        else:
            username = email.split("@")[0]
            base_username = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
            )
            UserProfile.objects.create(user=user)
            login(request, user)
            messages.success(request, "Регистрация прошла успешно!")
            return redirect("shop:profile")

    return render(request, "auth/register.html")


def logout_view(request):
    logout(request)
    return redirect("shop:index")


def forgot_password_view(request):
    if request.method == "POST":
        messages.info(
            request,
            "Если аккаунт с таким email существует, мы отправили ссылку для сброса пароля.",
        )
    return render(request, "auth/forgot_password.html")


@login_required
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    orders = request.user.orders.all()[:10]

    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        email = request.POST.get("email", "").strip()
        phone = request.POST.get("phone", "").strip()
        photo = request.FILES.get("photo")

        if name:
            request.user.username = name
        if email:
            request.user.email = email
        request.user.save()

        if phone:
            profile.phone = phone
        if photo:
            profile.photo = photo
        profile.save()

        messages.success(request, "Профиль обновлён.")
        return redirect("shop:profile")

    return render(
        request,
        "auth/profile.html",
        {
            "profile": profile,
            "orders": orders,
        },
    )


# ── Корзина ──────────────────────────────────────────────────


def _get_cart_items(request):
    if request.user.is_authenticated:
        return CartItem.objects.filter(user=request.user).select_related("product")
    else:
        session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
        return CartItem.objects.filter(session_key=session_key).select_related(
            "product"
        )


def basket_view(request):
    items = _get_cart_items(request)
    total = sum(item.total_price for item in items)
    count = sum(item.quantity for item in items)

    return render(
        request,
        "basket.html",
        {
            "items": items,
            "total": total,
            "total_formatted": f"{int(total):,}".replace(",", " ") + " ₽",
            "count": count,
        },
    )


@require_POST
def cart_add(request):
    product_id = request.POST.get("product_id")
    product = get_object_or_404(Product, pk=product_id, is_available=True)

    if request.user.is_authenticated:
        item, created = CartItem.objects.get_or_create(
            user=request.user, product=product, defaults={"quantity": 1}
        )
        if not created:
            item.quantity += 1
            item.save()
    else:
        if not request.session.session_key:
            request.session.create()
        session_key = request.session.session_key
        item, created = CartItem.objects.get_or_create(
            session_key=session_key, product=product, defaults={"quantity": 1}
        )
        if not created:
            item.quantity += 1
            item.save()

    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        items = _get_cart_items(request)
        count = sum(i.quantity for i in items)
        return JsonResponse({"status": "ok", "cart_count": count})

    next_url = request.POST.get("next", request.META.get("HTTP_REFERER", "/"))
    return redirect(next_url)


@require_POST
def cart_update(request):
    item_id = request.POST.get("item_id")
    action = request.POST.get("action")

    if request.user.is_authenticated:
        item = get_object_or_404(CartItem, pk=item_id, user=request.user)
    else:
        session_key = request.session.session_key or ""
        item = get_object_or_404(CartItem, pk=item_id, session_key=session_key)

    if action == "increase":
        item.quantity += 1
        item.save()
    elif action == "decrease":
        if item.quantity > 1:
            item.quantity -= 1
            item.save()
        else:
            item.delete()
    elif action == "remove":
        item.delete()

    return redirect("shop:basket")


@require_POST
@login_required
def checkout(request):
    items = _get_cart_items(request)
    if not items.exists():
        messages.error(request, "Корзина пуста.")
        return redirect("shop:basket")

    total = sum(item.total_price for item in items)
    order = Order.objects.create(
        user=request.user,
        total_amount=total,
    )

    for item in items:
        OrderItem.objects.create(
            order=order,
            product=item.product,
            product_name=str(item.product),
            price=item.product.price,
            quantity=item.quantity,
        )

    items.delete()

    messages.success(
        request, f"Заказ #{order.pk} оформлен! Сумма: {order.formatted_total}"
    )
    return redirect("shop:profile")
