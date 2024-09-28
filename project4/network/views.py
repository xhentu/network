from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect, HttpResponseBadRequest
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
@csrf_exempt
def posts(request):
    if request.method == "POST":
        # Create a new post
        data = json.loads(request.body)
        content = data.get("content")
        post = Post(user=request.user, content=content)
        post.save()
        return JsonResponse({"id": post.id, "content": post.content, "timestamp": post.timestamp, "user": post.user.username}, status=201)
    elif request.method == "GET":
        posts = Post.objects.all().order_by("-timestamp")
        posts_list = [{
            'id': post.id,
            'user': post.user.username,
            'content': post.content,
            'timestamp': post.timestamp,
            'like_count': post.likes.count(),
            'is_liked': request.user in post.likes.all(),
            'is_owner': post.user == request.user  # Add ownership field
        } for post in posts]

        return JsonResponse({
            'posts': posts_list,
            'current_user': request.user.username  # Add the logged-in user info here
        })

@login_required
@csrf_exempt
def edit_post(request, post_id):
    if request.method == 'POST':
        # Get the post to edit
        post = get_object_or_404(Post, id=post_id)
        # Check if the user is the owner of the post
        if post.user != request.user:
            return JsonResponse({"error": "You do not have permission to edit this post."}, status=403)
        # Get the new content from the request
        new_content = request.POST.get('content')
        if not new_content:
            return JsonResponse({"error": "Content cannot be empty."}, status=400)
        # Update the post's content
        post.content = new_content
        post.save()
        return JsonResponse({"message": "Post updated successfully."}, status=200)
    return JsonResponse({"error": "POST request required."}, status=400)
    
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
            "like_count": post.likes.count(),
            'user': post.user.username,
            'is_owner': post.user == request.user,  # Already checking ownership
        } for post in posts],
        "is_following": is_following,
        "followers_count": user.followers.count(),
        "following_count": user.following.count(),
        "current_user": request.user.username  # Add the logged-in user's username here
    })

@login_required
@csrf_exempt
def like_post(request, post_id):
    if request.method == "POST":
        try:
            post = get_object_or_404(Post, id=post_id)
            user = request.user

            # Parse the JSON body
            data = json.loads(request.body)
            liked = data.get('liked', False)  # Get 'liked' status from the request

            if liked:
                # Like the post
                Like.objects.get_or_create(user=user, post=post)
            else:
                # Unlike the post
                Like.objects.filter(user=user, post=post).delete()

            # Return the updated like count and a success message
            return JsonResponse({
                "message": "Like status updated successfully.",
                "like_count": post.likes.count()
            }, status=200)
        
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON data."}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "POST request required."}, status=400)

@login_required
@csrf_exempt
def follow_user(request, username):
    user_to_follow = get_object_or_404(User, username=username)
    follower = request.user

    # Prevent user from following themselves
    if follower == user_to_follow:
        return JsonResponse({"error": "You cannot follow yourself."}, status=400)

    # Handle follow/unfollow logic
    if Follow.objects.filter(follower=follower, following=user_to_follow).exists():
        # Unfollow if already following
        Follow.objects.filter(follower=follower, following=user_to_follow).delete()
        return JsonResponse({"message": "Unfollowed successfully."}, status=200)
    else:
        # Follow if not already following
        Follow.objects.create(follower=follower, following=user_to_follow)
        return JsonResponse({"message": "Followed successfully."}, status=201)

@login_required
def following_posts(request):
    # Get the list of users that the current user is following via the Follow model
    current_user = request.user
    following_users = Follow.objects.filter(follower=current_user).values_list('following', flat=True)

    # Get the posts from those users
    posts = Post.objects.filter(user__in=following_users).order_by('-timestamp')

    # Format the post data for JSON response
    post_list = [{
        'id': post.id,
        'user': post.user.username,
        'content': post.content,
        'timestamp': post.timestamp,
        'like_count': post.like_count(),
        'is_liked': post.likes.filter(id=current_user.id).exists(),
        'is_owner': post.user == current_user
    } for post in posts]

    return JsonResponse({'posts': post_list})

