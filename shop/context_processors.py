from .models import CartItem, Category


def global_context(request):
    categories = Category.objects.filter(is_active=True)

    cart_count = 0
    if request.user.is_authenticated:
        cart_count = sum(
            item.quantity for item in CartItem.objects.filter(user=request.user)
        )
    elif hasattr(request, "session") and request.session.session_key:
        cart_count = sum(
            item.quantity
            for item in CartItem.objects.filter(session_key=request.session.session_key)
        )

    return {
        "nav_categories": categories,
        "cart_count": cart_count,
    }
