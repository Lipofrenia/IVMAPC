from django import template

register = template.Library()


@register.filter
def format_price(value):
    try:
        return f"{int(value):,}".replace(",", " ") + " ₽"
    except (ValueError, TypeError):
        return value


@register.filter
def multiply(value, arg):
    try:
        return int(value) * int(arg)
    except (ValueError, TypeError):
        return 0
