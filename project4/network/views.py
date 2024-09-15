from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from .models import User, Post, Follow, Like
import json

def index(request):
    return render(request, "network/index.html")


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

@login_required
def posts(request):
    if request.method == "POST":
        data = json.loads(request.body)
        content = data.get("content")
        post = Post(user=request.user, content=content)
        post.save()
        return JsonResponse({"id": post.id, "content": post.content, "timestamp": post.timestamp, "user": post.user.username}, status=201)
    
    elif request.method == "GET":
        posts = Post.objects.all().order_by("-timestamp")
        return JsonResponse([{
            "id": post.id,
            "user": post.user.username,
            "content": post.content,
            "timestamp": post.timestamp,
            "like_count": post.likes.count()
        } for post in posts], safe=False)
    
@login_required
def profile(request, username):
    user = get_object_or_404(User, username=username)
    posts = user.posts.all().order_by("-timestamp")
    is_following = Follow.objects.filter(follower=request.user, following=user).exists()

    return JsonResponse({
        "user": {"username": user.username, "email": user.email},
        "posts": [{
            "id": post.id,
            "content": post.content,
            "timestamp": post.timestamp,
            "like_count": post.likes.count()
        } for post in posts],
        "is_following": is_following,
        "followers_count": user.followers.count(),
        "following_count": user.following.count()
    })

@login_required
@csrf_exempt
def like_post(request, post_id):
    if request.method == "POST":
        post = get_object_or_404(Post, id=post_id)
        if request.user in post.likes.all():
            post.likes.remove(request.user)
            return JsonResponse({"message": "Like removed."}, status=200)
        else:
            post.likes.add(request.user)
            return JsonResponse({"message": "Like added."}, status=201)
    return JsonResponse({"error": "POST request required."}, status=400)

@login_required
@csrf_exempt
def follow_user(request, username):
    if request.method == "POST":
        user_to_follow = get_object_or_404(User, username=username)
        follower = request.user

        if Follow.objects.filter(follower=follower, following=user_to_follow).exists():
            Follow.objects.filter(follower=follower, following=user_to_follow).delete()
            return JsonResponse({"message": "Unfollowed successfully."}, status=200)
        else:
            Follow.objects.create(follower=follower, following=user_to_follow)
            return JsonResponse({"message": "Followed successfully."}, status=201)
    return JsonResponse({"error": "POST request required."}, status=400)
