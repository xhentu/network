document.addEventListener('DOMContentLoaded', function() {
    // Get the logged-in user's username
    const profileLink = document.querySelector('#profileName');
    const loggedInUsername = profileLink.getAttribute('data-username'); // Retrieve username from data-username attribute
    profileLink.addEventListener('click', () => showProfile(loggedInUsername));

    document.querySelector('#newPost').addEventListener('click', () => postNew());
    document.querySelector('#following').addEventListener('click', () => showFollowing());

    // Fetch posts when the page loads
    fetchingPosts();
});


function fetchingPosts() {
    const mainContent = document.getElementById('body');
    // Fetch '/posts' route with 'GET' method
    fetch('/posts', {
        method: 'GET'
    })
    // Phrase json data into posts
    .then(response => response.json())
    // Then console.log post and append to HTML
    .then(posts => {
        console.log("Received GET response (posts):", posts); 
        // Creating main post Container and append by repeatly calling function using forEach
        const postContainer = document.createElement('div');
        postContainer.classList = "m-3 p-2";
        posts.forEach(post => {
        appendPost(post, postContainer); // Append each post
        });
        // Then append that post Container to body div
        mainContent.insertAdjacentElement('afterbegin', postContainer); // Insert posts after form
    })
    .catch(error => console.error('Error:', error));
}

function appendPost(post, container = null) {
    const timestamp = new Date(post.timestamp);
    const formattedTimestamp = timestamp.toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const likeIcon = post.is_liked ? '💔' : '❤️';

    const postHtml = `
        <div class="card mb-3">
            <div class="card-body">
                <h5 class="card-title post-username" data-username="${post.user}">
                    <strong>${post.user}</strong>
                    ${post.is_owner ? `<span class="edit-btn" data-post-id="${post.id}" style="float:right; cursor:pointer;">✏️</span>` : ''}
                </h5>
                <p class="card-text">${post.content}</p>
                <p class="card-text">
                    <small class="text-muted">${formattedTimestamp}</small>
                </p>
                <p class="card-text">
                    <span class="like-btn" data-post-id="${post.id}" data-liked="${post.is_liked}">
                        ${likeIcon}
                    </span>
                    <span> Likes: ${post.like_count}</span>
                </p>
            </div>
        </div>
    `;

    const postDiv = document.createElement('div');
    postDiv.innerHTML = postHtml;

    container.appendChild(postDiv); // Append to the provided container

    // Add the click event listener to the username link
    postDiv.querySelector('.post-username').addEventListener('click', function() {
        const username = this.getAttribute('data-username');
        showProfile(username);  // Call the showProfile function with the username
    });

    // Add the click event listener for the like button
    postDiv.querySelector('.like-btn').addEventListener('click', toggleLike);

    // Add the click event listener for the edit button, if present
    const editBtn = postDiv.querySelector('.edit-btn');
    if (editBtn) {
        editBtn.addEventListener('click', editPost);
    }
}

function editPost(event) {
    // Ensure the event is targeting the correct element (the span with data-post-id)
    const targetElement = event.target.closest('.edit-btn');  // Find the nearest element with class 'edit-btn'

    if (!targetElement) {
        console.error("Edit button element not found.");
        return;
    }

    const postId = targetElement.getAttribute('data-post-id');
    const newContent = prompt("Edit your post:");

    if (newContent) {
        fetch(`/edit_post/${postId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': getCookie('csrftoken')  // Pass the CSRF token
            },
            body: `content=${encodeURIComponent(newContent)}`  // Send the updated content
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.message) {
                console.log(data.message);
                // Update the post content on the page
                targetElement.closest('.card-body').querySelector('.card-text').innerText = newContent;
            }
        })
        .catch(error => {
            console.error('Error editing post:', error);
        });
    }
}

function toggleLike(event) {
    const likeButton = event.target;
    const postId = likeButton.getAttribute('data-post-id');
    let isLiked = likeButton.getAttribute('data-liked') === 'true';

    // Optimistically toggle the like state in the UI
    isLiked = !isLiked;
    likeButton.textContent = isLiked ? '💔' : '❤️';
    likeButton.setAttribute('data-liked', isLiked);

    // Send the like/unlike request to the server
    fetch(`/like/${postId}`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            liked: isLiked
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Error:', data.error);
            // Revert the like state in case of an error
            likeButton.textContent = !isLiked ? '💔' : '❤️';
            likeButton.setAttribute('data-liked', !isLiked);
        } else {
            console.log(data.message);
            // Optionally, you can update the like count here if the server returns it
            likeButton.nextElementSibling.textContent = ` Likes: ${data.like_count}`;
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Revert the like state in case of a network error
        likeButton.textContent = !isLiked ? '💔' : '❤️';
        likeButton.setAttribute('data-liked', !isLiked);
    });
}

function showProfile(username) {
    // Clear previous content
    document.getElementById('body').innerHTML = '';

    // Fetch profile data
    fetch(`/profile/${username}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(profile => {
        console.log("Received profile data:", profile); // Log the profile data
        
        // Create profile header
        const profileHtml = `
            <div class="profile-header card mb-3">
                <div class="card-body">
                    <h2 class="card-title">${profile.user.username}</h2>
                    <p>Email: ${profile.user.email}</p>
                    <p>Followers: ${profile.followers_count}</p>
                    <p>Following: ${profile.following_count}</p>
                    <button id="follow-button" class="btn btn-${profile.is_following ? 'danger' : 'success'}">
                        ${profile.is_following ? 'Unfollow' : 'Follow'}
                    </button>
                </div>
            </div>
        `;

        const profileContainer = document.createElement('div');
        profileContainer.innerHTML = profileHtml;

        // Add user's posts to profile page
        profile.posts.forEach(post => {
            post.user = profile.user.username;
            appendPost(post, profileContainer);
        });

        // Insert the profile data into the main content area
        document.getElementById('body').appendChild(profileContainer);

        // Add event listener to the follow/unfollow button
        const followButton = document.getElementById('follow-button');
        followButton.addEventListener('click', function() {
            toggleFollow(username);
        });
    })
    .catch(error => console.error('Error loading profile:', error));
}

function toggleFollow(username) {
    // Send POST request to follow or unfollow the user
    fetch(`/follow/${username}`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken') // Ensure CSRF token is included
        }
    })
    .then(response => response.json())
    .then(result => {
        console.log("Follow/Unfollow response:", result);
        // Update the button text and style based on the result
        const followButton = document.getElementById('follow-button');
        if (followButton.innerText === 'Follow') {
            followButton.innerText = 'Unfollow';
            followButton.classList.remove('btn-success');
            followButton.classList.add('btn-danger');
        } else {
            followButton.innerText = 'Follow';
            followButton.classList.remove('btn-danger');
            followButton.classList.add('btn-success');
        }
    })
    .catch(error => console.error('Error during follow/unfollow action:', error));
}

function postNew() {
    // Clear previous content
    const body = document.getElementById('body');
    body.innerHTML = '';
    // Creating post form
    const postFormContainer = document.createElement('div');
    const formHtml = `
        <form id="post-form">
        <label for="post-content" class="form-label">What's on your mind?</label>
            <textarea id="post-content" class="form-control" placeholder="Write something..." required></textarea>
            <button type="submit" class="btn btn-primary mt-2">Post</button>
        </form>
    `;
    postFormContainer.innerHTML = formHtml;
    body.appendChild(postFormContainer);
    postSubmittion();
}

function postSubmittion() {
    console.log('starting post function')
    // Searching post-content and declaring variable
    const postForm = document.getElementById('post-form');
    postForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Preventing page refresh

        const content = document.getElementById('post-content').value;
        // Console.log the data
        console.log("Sending POST data:", { content });

        fetch('/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // CSRF protection
            },
            body: JSON.stringify({ content: content })
        })
        .then(response => response.json())
        .then(result => {
            console.log("Received POST response:", result); // Log the server response
            document.getElementById('post-content').value = ''; // Clear form
        })
        .catch(error => console.error('Error:', error));
    });
}

// CSRF token helper function
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Post editing needed  => half done but needed to add those editing feature also in profile page.
// Following user's posts view needed
// Post animations needed
// Detail css needed
// Revision needed
// Message alert needed
// user following himself case need to be clear
