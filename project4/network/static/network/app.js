document.addEventListener('DOMContentLoaded', function() {
    try {
        // Try to get the profile link element
        const profileLink = document.querySelector('#profileName');

        // If profileLink is found, proceed with retrieving the username and adding event listener
        if (profileLink) {
            const loggedInUsername = profileLink.getAttribute('data-username');
            profileLink.addEventListener('click', () => showProfile(loggedInUsername));
        } else {
            console.log('No logged-in user');
        }
    } catch (error) {
        // Catch any errors that occur and log the error message
        console.error('Error while accessing profile link:', error);
    }

    // Add event listeners for other buttons
    document.querySelector('#all-posts-btn').addEventListener('click', function() {
        // Clear the body content before fetching new posts
        document.getElementById('body').innerHTML = '';
        
        // Fetch and display all posts when "All Posts" button is clicked
        fetchingPosts();
    });

    document.querySelector('#new-post').addEventListener('click', () => postNew());
    document.querySelector('#following').addEventListener('click', () => showFollowing());

    // Fetch posts when the page loads
    fetchingPosts();
});

function fetchingPosts(page = 1) {
    history.pushState({ view: 'posts', page: page }, "", `/posts?page=${page}`);
    fetch(`/posts?page=${page}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        const mainContent = document.getElementById('body');
        mainContent.innerHTML = '';

        // Loop through and display posts
        data.posts.forEach(post => {
            appendPost(post, mainContent);  // Use appendPost for rendering
        });

        // Create pagination buttons
        const paginationContainer = createPaginationButtons(
            data.has_previous, 
            data.has_next, 
            data.current_page, 
            fetchingPosts // Pass fetchingPosts as the callback
        );
        mainContent.appendChild(paginationContainer);
    })
    .catch(error => console.error('Error fetching posts:', error));
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
        <div class="card mb-3 post-container">
            <div class="card-body">
                <h5 class="card-title post-username text-success" data-username="${post.user}">
                    <strong>${post.user}</strong>
                    ${post.is_owner ? `<span class="edit-btn" data-post-id="${post.id}" style="float:right; cursor:pointer;"><i class="fas fa-edit text-success"></i></span>` : ''}
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
    postDiv.classList.add('post-animation');
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

function showProfile(username, page = 1) {
    history.pushState({ view: 'profile', username: username, page: page }, "", `/profile/${username}?page=${page}`);
    // Clear previous content
    document.getElementById('body').innerHTML = '';

    // Fetch profile data with pagination
    fetch(`/profile/${username}?page=${page}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(profile => {
        console.log("Received profile data:", profile);

        // Create profile header
        const profileHtml = `
            <div class="profile-header bg-success card mb-3 post-container">
                <div class="card-body">
                    <h2 class="card-title">${profile.user.username}</h2>
                    <p>Email: ${profile.user.email}</p>
                    <p id="follower-count">Followers: ${profile.followers_count}</p>
                    <p>Following: ${profile.following_count}</p>
                </div>
            </div>
        `;
        const profileContainer = document.createElement('div');
        profileContainer.classList.add('slide-in-left');
        profileContainer.innerHTML = profileHtml;

        // Show follow/unfollow button if it's not the current user's profile
        if (profile.user.username !== profile.current_user) {  
            const followButtonHtml = `
                <button id="follow-button" class="btn btn-${profile.is_following ? 'dark' : 'light'}">
                    ${profile.is_following ? 'Unfollow' : 'Follow'}
                </button>
            `;
            profileContainer.querySelector('.card-body').insertAdjacentHTML('beforeend', followButtonHtml);

            // Attach event listener after the button is added to DOM
            const followButton = profileContainer.querySelector('#follow-button');
            if (followButton) {
                followButton.addEventListener('click', () => {
                    toggleFollow(username);
                });
            }
        }

        // Add user's posts to profile page
        profile.posts.forEach(post => {
            post.user = profile.user.username; // Ensure post shows correct username
            appendPost(post, profileContainer); // Use the existing appendPost function
        });

        // Insert the profile data into the main content area
        const mainContent = document.getElementById('body');
        mainContent.appendChild(profileContainer);

        // Create pagination buttons
        const paginationContainer = createPaginationButtons(
            profile.has_previous, 
            profile.has_next, 
            profile.current_page, 
            (newPage) => showProfile(username, newPage)  // Use showProfile with the username and new page
        );
        mainContent.appendChild(paginationContainer);
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

        // Update the button text and style
        const followButton = document.getElementById('follow-button');
        const followerCount = document.getElementById('follower-count');
        let currentCount = parseInt(followerCount.innerText.split(': ')[1]); // Extract current follower count

        if (followButton.innerText === 'Follow') {
            followButton.innerText = 'Unfollow';
            followButton.classList.remove('btn-light');
            followButton.classList.add('btn-dark');

            // Increment follower count after following
            followerCount.innerText = `Followers: ${currentCount + 1}`;
        } else {
            followButton.innerText = 'Follow';
            followButton.classList.remove('btn-dark');
            followButton.classList.add('btn-light');

            // Decrement follower count after unfollowing
            followerCount.innerText = `Followers: ${currentCount - 1}`;
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
        <form id="post-form" class='post-container'>
        <label for="post-content" class="form-label">What's on your mind?</label>
            <textarea id="post-content" class="form-control" placeholder="Write something..." required></textarea>
            <button type="submit" class="btn btn-success mt-2">Post</button>
        </form>
    `;
    postFormContainer.innerHTML = formHtml;
    postFormContainer.classList.add('fade-in');
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

function showFollowing(page = 1) {
    history.pushState({ view: 'following', page: page }, "", `/following?page=${page}`);
    // Clear previous content
    document.getElementById('body').innerHTML = '';

    // Fetch following posts with pagination
    fetch(`/following?page=${page}`, {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        console.log("Received following posts:", data.posts);

        // Create a container for posts
        const postContainer = document.createElement('div');
        postContainer.classList = "m-3 p-2";

        // Loop through the posts and append them to the container
        data.posts.forEach(post => {
            appendPost(post, postContainer);  // Use the existing appendPost function
        });

        // Append the container to the body
        document.getElementById('body').appendChild(postContainer);

        // Create pagination buttons using the reusable function
        const paginationContainer = createPaginationButtons(
            data.has_previous, 
            data.has_next, 
            data.current_page, 
            showFollowing // Pass showFollowing as the callback for pagination
        );

        // Append pagination buttons to the body
        document.getElementById('body').appendChild(paginationContainer);
    })
    .catch(error => console.error('Error loading following posts:', error));
}

// Function to create and display an alert message
function showAlert(message, type = 'danger') {
    const alertElement = document.createElement('div');
    alertElement.classList.add('alert', `alert-${type}`);
  
    alertElement.textContent = message;
  
    // Find the main content container
    const mainContent = document.getElementById('body');
  
    // Append the alert message to the beginning of the main content
    mainContent.insertAdjacentElement('afterbegin', alertElement);
  
    // Automatically remove the alert after a delay (e.g., 3 seconds)
    setTimeout(() => {
      alertElement.remove();
    }, 3000);
  }

function createPaginationButtons(hasPrevious, hasNext, currentPage, callback) {
    const paginationContainer = document.createElement('div');
    paginationContainer.classList.add('pagination-container', 'mt-3');

    if (hasPrevious) {
        const prevButton = document.createElement('button');
        prevButton.textContent = "Previous";
        prevButton.classList.add('btn', 'btn-success', 'me-2');
        prevButton.addEventListener('click', () => callback(currentPage - 1));
        paginationContainer.appendChild(prevButton);
    }

    if (hasNext) {
        const nextButton = document.createElement('button');
        nextButton.textContent = "Next";
        nextButton.classList.add('btn', 'btn-success');
        nextButton.addEventListener('click', () => callback(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    }

    return paginationContainer;
}

// Handle browser's back/forward buttons
window.onpopstate = function(event) {
    if (event.state) {
        if (event.state.view === 'profile') {
            showProfile(event.state.username, event.state.page);
        } else if (event.state.view === 'following') {
            showFollowing(event.state.page);
        } else if (event.state.view === 'posts') {
            fetchingPosts(event.state.page);
        }
    }
};

// Message alert needed
// URL for user to go back and forth is needed
// Revision needed