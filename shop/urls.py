from django.urls import path

from . import views

app_name = "shop"

urlpatterns = [
    path("", views.index, name="index"),
    path("catalog/", views.catalog, name="catalog"),
    path("catalog/<slug:slug>/", views.category_detail, name="category"),
    path(
        "catalog/<slug:cat_slug>/<slug:prod_slug>/",
        views.product_detail,
        name="product",
    ),
    path("search/", views.search, name="search"),
    # Auth
    path("auth/login/", views.login_view, name="login"),
    path("auth/register/", views.register_view, name="register"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/forgot-password/", views.forgot_password_view, name="forgot_password"),
    path("auth/profile/", views.profile_view, name="profile"),
    # Cart
    path("basket/", views.basket_view, name="basket"),
    path("cart/add/", views.cart_add, name="cart_add"),
    path("cart/update/", views.cart_update, name="cart_update"),
    path("cart/checkout/", views.checkout, name="checkout"),
]
