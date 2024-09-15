
from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path('posts', views.posts, name='posts'),
    path('profile/<str:username>', views.profile, name='profile'),
    path('follow/<str:username>', views.follow_user, name='follow_user'),
    path('like/<int:post_id>', views.like_post, name='like_post'),
]
