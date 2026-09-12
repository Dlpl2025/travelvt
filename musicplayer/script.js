// JioSaavn Public API Base Endpoint
const API_BASE = "https://jiosaavn-api-codyandersan.vercel.app";

// DOM Elements
const mainContainer = document.getElementById("mainContainer");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const loader = document.getElementById("loader");
const backBtn = document.getElementById("backBtn");

// Fullscreen Player Elements
const fullscreenPlayer = document.getElementById("fullscreenPlayer");
const closePlayerBtn = document.getElementById("closePlayerBtn");
const vinylDisc = document.getElementById("vinylDisc");
const audioSource = document.getElementById("audioSource");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const shuffleBtn = document.getElementById("shuffleBtn");
const shuffleIcon = document.getElementById("shuffleIcon");
const repeatBtn = document.getElementById("repeatBtn");
const repeatIcon = document.getElementById("repeatIcon");
const downloadBtn = document.getElementById("downloadBtn");
const currentThumb = document.getElementById("currentThumb");
const currentTitle = document.getElementById("currentTitle");
const currentArtist = document.getElementById("currentArtist");
const progressBar = document.getElementById("progressBar");
const currentTimeLabel = document.getElementById("currentTime");
const totalDurationLabel = document.getElementById("totalDuration");
const themeToggle = document.getElementById("themeToggle");

// Queue Elements
const queueToggleBtn = document.getElementById("queueToggleBtn");
const closeQueueBtn = document.getElementById("closeQueueBtn");
const queueDrawer = document.getElementById("queueDrawer");
const queueList = document.getElementById("queueList");

// Playback Queue & Modes State
let currentPlaylist = [];
let currentIndex = -1;
let currentSongData = null;
let isShuffle = false;
let repeatMode = 0; // 0: Off (repeat1.png), 1: Repeat All (repeat2.png), 2: Repeat One (repeat3.png)

// Loading bar helper
function setProgress(percent) {
    if (!loader) return;
    loader.style.width = percent + "%";
    if (percent >= 100) {
        setTimeout(() => { loader.style.width = "0%"; }, 300);
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function sanitize(str) {
    if (!str) return "";
    return String(str).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'");
}

function extractImage(item) {
    if (!item) return 'icon.png';
    if (typeof item.image === "string") return item.image;
    if (Array.isArray(item.image) && item.image.length > 0) {
        return item.image[item.image.length - 1]?.link || item.image[0]?.link || 'icon.png';
    }
    return 'icon.png';
}

function getArtistNames(item) {
    if (!item) return "";
    if (Array.isArray(item.primaryArtists)) {
        return item.primaryArtists.map(a => typeof a === 'object' ? a.name : a).filter(Boolean).join(", ");
    }
    if (typeof item.primaryArtists === "string" && item.primaryArtists.trim() !== "") {
        return item.primaryArtists;
    }
    if (Array.isArray(item.artists)) {
        return item.artists.map(a => typeof a === 'object' ? a.name : a).filter(Boolean).join(", ");
    }
    if (typeof item.artist === "string") return item.artist;
    if (typeof item.subtitle === "string") return item.subtitle;
    if (typeof item.role === "string") return item.role;
    return "";
}

// -------------------------------------------------------------
// VIBRANT COLOR EXTRACTOR (Extracts Rich Colors from Thumbnail)
// -------------------------------------------------------------
function extractColorsFromImage(imgUrl) {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imgUrl;

    img.onload = () => {
        try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = 16;
            canvas.height = 16;
            ctx.drawImage(img, 0, 0, 16, 16);
            const data = ctx.getImageData(0, 0, 16, 16).data;

            let r1 = 0, g1 = 0, b1 = 0, count1 = 0;
            let r2 = 0, g2 = 0, b2 = 0, count2 = 0;

            // Sample top half (Color 1)
            for (let i = 0; i < data.length / 2; i += 4) {
                if (data[i] + data[i + 1] + data[i + 2] > 60) {
                    r1 += data[i];
                    g1 += data[i + 1];
                    b1 += data[i + 2];
                    count1++;
                }
            }

            // Sample bottom half (Color 2)
            for (let i = data.length / 2; i < data.length; i += 4) {
                if (data[i] + data[i + 1] + data[i + 2] > 60) {
                    r2 += data[i];
                    g2 += data[i + 1];
                    b2 += data[i + 2];
                    count2++;
                }
            }

            count1 = count1 || 1;
            count2 = count2 || 1;

            // Vibrant tone calculation
            r1 = Math.min(255, Math.floor((r1 / count1) * 0.85));
            g1 = Math.min(255, Math.floor((g1 / count1) * 0.85));
            b1 = Math.min(255, Math.floor((b1 / count1) * 0.85));

            r2 = Math.min(255, Math.floor((r2 / count2) * 0.65));
            g2 = Math.min(255, Math.floor((g2 / count2) * 0.65));
            b2 = Math.min(255, Math.floor((b2 / count2) * 0.65));

            document.documentElement.style.setProperty('--dyn-color-1', `rgb(${r1}, ${g1}, ${b1})`);
            document.documentElement.style.setProperty('--dyn-color-2', `rgb(${r2}, ${g2}, ${b2})`);
        } catch (e) {
            document.documentElement.style.setProperty('--dyn-color-1', '#3b2f75');
            document.documentElement.style.setProperty('--dyn-color-2', '#141026');
        }
    };
}

// History Navigation Manager
function pushNavigationState(action, params = {}) {
    window.history.pushState({ action, params }, "");
}

window.onpopstate = function (event) {
    if (event.state) {
        const { action, params } = event.state;
        if (action === "home") loadHomePage(false);
        else if (action === "search") {
            searchInput.value = params.query || "";
            searchAll(false);
        }
        else if (action === "artist") loadArtistDetails(params.id, params.name, false);
        else if (action === "album") loadAlbumSongs(params.id, params.name, params.hint, false);
        else if (action === "playlist") loadPlaylistSongs(params.id, params.name, false);
    } else {
        loadHomePage(false);
    }
};

backBtn.onclick = () => {
    window.history.back();
};

// 1. Home Page Loader
async function loadHomePage(pushState = true) {
    if (pushState) pushNavigationState("home");
    try {
        setProgress(30);
        mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">Loading songs, please wait...</p>`;

        const res = await fetch(`${API_BASE}/modules?language=bengali,hindi,english`);
        setProgress(70);
        const json = await res.json();
        setProgress(90);

        mainContainer.innerHTML = "";
        const data = json.data || {};

        const latestSongs = (data.trending && data.trending.songs) || [];
        if (latestSongs.length > 0) {
            renderSection("🆕 Newly Released Songs", latestSongs, "song");
        }

        const suggestedArtists = [
            { id: "459320", name: "Arijit Singh", subtitle: "Top Artist", image: "https://c.saavncdn.com/artists/Arijit_Singh_002_20230323062147_500x500.jpg" },
            { id: "456863", name: "Anupam Roy", subtitle: "Top Singer-Songwriter", image: "https://c.saavncdn.com/artists/Anupam_Roy_500x500.jpg" },
            { id: "485956", name: "Shreya Ghoshal", subtitle: "Top Singer", image: "https://c.saavncdn.com/artists/Shreya_Ghoshal_500x500.jpg" },
            { id: "468245", name: "Atif Aslam", subtitle: "Artist", image: "https://c.saavncdn.com/artists/Atif_Aslam_500x500.jpg" },
            { id: "1274170", name: "Rupam Islam", subtitle: "Fossils", image: "https://c.saavncdn.com/artists/Rupam_Islam_500x500.jpg" }
        ];
        renderSection("🌟 Popular Artists", suggestedArtists, "artist");

        const albums = (data.trending && data.trending.albums) || data.albums || [];
        if (albums.length > 0) {
            renderSection("💿 Popular Albums", albums, "album");
        }

        const playlists = data.playlists || [];
        if (playlists.length > 0) {
            renderSection("🎶 Recommended Playlists", playlists, "playlist");
        }

        setProgress(100);
    } catch (error) {
        console.error("Home load error:", error);
        mainContainer.innerHTML = `
            <div style="text-align:center; padding: 40px;">
                <p style="color: #ff5555; margin-bottom: 12px;">Failed to load the home page.</p>
                <button onclick="loadHomePage()" style="background:var(--accent); color:#fff; border:none; padding:8px 20px; border-radius:20px; cursor:pointer;">Try Again</button>
            </div>
        `;
        setProgress(100);
    }
}

// 2. Section Renderer
function renderSection(title, items, type) {
    if (!items || items.length === 0) return;

    const section = document.createElement("section");
    section.className = "home-section";

    const header = document.createElement("div");
    header.className = "section-header";
    header.innerHTML = `<h2>${title}</h2>`;
    section.appendChild(header);

    const grid = document.createElement("div");
    grid.className = "grid-layout";

    items.forEach((item, index) => {
        const card = document.createElement("div");
        const isArtist = type === "artist";
        card.className = `card-item ${isArtist ? 'artist-card' : ''}`;

        const imgUrl = extractImage(item);
        const name = sanitize(item.name || item.title || "Unknown");
        const sub = sanitize(getArtistNames(item));

        card.innerHTML = `
            <img src="${imgUrl}" alt="${name}" loading="lazy" onerror="this.src='icon.png'">
            <span class="badge">${type}</span>
            <h3>${name}</h3>
            <p>${sub || (type.toUpperCase())}</p>
        `;

        card.onclick = () => {
            if (type === "song") {
                playSongFromQueue(items, index);
            } else if (type === "artist") {
                loadArtistDetails(item.id, name);
            } else if (type === "album") {
                loadAlbumSongs(item.id, name, sub || name);
            } else if (type === "playlist") {
                loadPlaylistSongs(item.id, name);
            }
        };

        grid.appendChild(card);
    });

    section.appendChild(grid);
    mainContainer.appendChild(section);
}

// 3. Search Songs & Multi-Categories
async function searchAll(pushState = true) {
    const query = searchInput.value.trim();
    if (!query) return;

    if (pushState) pushNavigationState("search", { query });

    try {
        setProgress(30);
        mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">Searching results for "${query}"...</p>`;

        const [songsRes, allRes, albumsRes, playlistsRes] = await Promise.all([
            fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(query)}&page=1&limit=30`),
            fetch(`${API_BASE}/search/all?query=${encodeURIComponent(query)}`),
            fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(query)}&page=1&limit=15`),
            fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(query)}&page=1&limit=15`)
        ]);

        setProgress(75);
        const songsJson = await songsRes.json();
        const allJson = await allRes.json();
        const albumsJson = await albumsRes.json();
        const playlistsJson = await playlistsRes.json();
        setProgress(95);

        mainContainer.innerHTML = "";

        const artists = (allJson.data && allJson.data.artists && allJson.data.artists.results) || [];
        const songs = (songsJson.data && songsJson.data.results) || [];
        const albums = (albumsJson.data && albumsJson.data.results) || (allJson.data && allJson.data.albums && allJson.data.albums.results) || [];
        const playlists = (playlistsJson.data && playlistsJson.data.results) || (allJson.data && allJson.data.playlists && allJson.data.playlists.results) || [];

        let foundAny = false;

        if (artists.length > 0) {
            foundAny = true;
            renderSection(`🌟 Artists`, artists, "artist");
        }

        if (songs.length > 0) {
            foundAny = true;
            renderSection(`🔥 Popular & New Songs (${songs.length})`, songs, "song");
        }

        if (albums.length > 0) {
            foundAny = true;
            renderSection(`💿 Albums`, albums, "album");
        }

        if (playlists.length > 0) {
            foundAny = true;
            renderSection(`🎶 Playlists`, playlists, "playlist");
        }

        if (!foundAny) {
            mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">No results found for "${query}"!</p>`;
        }

        setProgress(100);
    } catch (error) {
        console.error("Search error:", error);
        mainContainer.innerHTML = `<p style="color: red; text-align:center; padding: 40px;">Failed to load search results.</p>`;
        setProgress(100);
    }
}

// 4. Load Artist Details
async function loadArtistDetails(artistId, artistName, pushState = true) {
    if (pushState) pushNavigationState("artist", { id: artistId, name: artistName });

    try {
        setProgress(30);
        mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">Loading profile, songs, and albums for ${artistName}...</p>`;
        
        let songs = [];
        let albums = [];
        let playlists = [];

        if (artistId) {
            try {
                const res = await fetch(`${API_BASE}/artists?id=${artistId}`);
                const json = await res.json();
                songs = json.data?.topSongs || json.data?.songs || [];
                albums = json.data?.topAlbums || json.data?.albums || [];
            } catch (err) {
                console.warn("Direct artist ID fetch fallback.");
            }
        }

        setProgress(60);

        try {
            const [songsSearchRes, albumsSearchRes, playlistsSearchRes] = await Promise.all([
                fetch(`${API_BASE}/search/songs?query=${encodeURIComponent(artistName)}&page=1&limit=30`),
                fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(artistName)}&page=1&limit=15`),
                fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(artistName)}&page=1&limit=15`)
            ]);
            const songsSearchJson = await songsSearchRes.json();
            const albumsSearchJson = await albumsSearchRes.json();
            const playlistsSearchJson = await playlistsSearchRes.json();

            if (!songs.length) songs = songsSearchJson.data?.results || [];
            if (!albums.length) albums = albumsSearchJson.data?.results || [];
            playlists = playlistsSearchJson.data?.results || [];
        } catch (err) {
            console.error(err);
        }

        setProgress(100);
        mainContainer.innerHTML = "";

        let hasContent = false;

        if (songs.length > 0) {
            hasContent = true;
            renderSection(`🎤 Songs by ${artistName}`, songs, "song");
        }

        if (albums.length > 0) {
            hasContent = true;
            renderSection(`💿 Popular Albums by ${artistName}`, albums, "album");
        }

        if (playlists.length > 0) {
            hasContent = true;
            renderSection(`🎶 Popular Playlists featuring ${artistName}`, playlists, "playlist");
        }

        if (!hasContent) {
            mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">No songs found for artist "${artistName}".</p>`;
        }

    } catch (e) {
        console.error(e);
        alert("Failed to load artist details.");
        setProgress(100);
    }
}

// 5. Load Album Songs + Suggestions
async function loadAlbumSongs(albumId, albumName, artistHint = "", pushState = true) {
    if (pushState) pushNavigationState("album", { id: albumId, name: albumName, hint: artistHint });

    try {
        setProgress(30);
        mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">Fetching album songs...</p>`;
        
        const res = await fetch(`${API_BASE}/albums?id=${albumId}`);
        const json = await res.json();
        setProgress(60);

        mainContainer.innerHTML = "";
        const songs = json.data?.songs || [];
        
        if (songs.length > 0) {
            renderSection(`💿 Album: ${albumName}`, songs, "song");
        } else {
            mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">No songs found in this album.</p>`;
        }

        const artist = (songs[0] && getArtistNames(songs[0])) || artistHint;
        const mainArtist = artist.split(",")[0].trim();

        if (mainArtist) {
            try {
                const [albumsRes, playlistsRes] = await Promise.all([
                    fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(mainArtist)}&page=1&limit=15`),
                    fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(mainArtist)}&page=1&limit=15`)
                ]);
                const albumsJson = await albumsRes.json();
                const playlistsJson = await playlistsRes.json();
                
                const otherAlbums = (albumsJson.data?.results || []).filter(a => a.id !== albumId);
                const relatedPlaylists = playlistsJson.data?.results || [];

                if (otherAlbums.length > 0) {
                    renderSection(`💿 Other Albums by ${mainArtist}`, otherAlbums, "album");
                }
                if (relatedPlaylists.length > 0) {
                    renderSection(`🎶 Related Playlists for ${mainArtist}`, relatedPlaylists, "playlist");
                }
            } catch (err) {
                console.warn("Suggestions fetch failed:", err);
            }
        }

        setProgress(100);
    } catch (e) {
        alert("Failed to open album.");
        setProgress(100);
    }
}

// 6. Load Playlist Songs + Suggestions
async function loadPlaylistSongs(playlistId, playlistName, pushState = true) {
    if (pushState) pushNavigationState("playlist", { id: playlistId, name: playlistName });

    try {
        setProgress(30);
        mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">Loading playlist...</p>`;
        
        const res = await fetch(`${API_BASE}/playlists?id=${playlistId}`);
        const json = await res.json();
        setProgress(60);

        mainContainer.innerHTML = "";
        const songs = json.data?.songs || [];
        
        if (songs.length > 0) {
            renderSection(`🎶 Playlist: ${playlistName}`, songs, "song");
        } else {
            mainContainer.innerHTML = `<p style="text-align:center; padding: 40px;">No songs found in this playlist.</p>`;
        }

        const sampleArtist = (songs[0] && getArtistNames(songs[0]).split(",")[0].trim()) || playlistName.split(" ")[0];

        try {
            const [playlistsRes, albumsRes] = await Promise.all([
                fetch(`${API_BASE}/search/playlists?query=${encodeURIComponent(sampleArtist)}&page=1&limit=15`),
                fetch(`${API_BASE}/search/albums?query=${encodeURIComponent(sampleArtist)}&page=1&limit=15`)
            ]);
            const playlistsJson = await playlistsRes.json();
            const albumsJson = await albumsRes.json();

            const suggestedPlaylists = (playlistsJson.data?.results || []).filter(p => p.id !== playlistId);
            const suggestedAlbums = albumsJson.data?.results || [];

            if (suggestedPlaylists.length > 0) {
                renderSection("🎶 Related Playlists", suggestedPlaylists, "playlist");
            }
            if (suggestedAlbums.length > 0) {
                renderSection("💿 Suggested Albums", suggestedAlbums, "album");
            }
        } catch (err) {
            console.warn("Playlist suggestions fetch failed:", err);
        }

        setProgress(100);
    } catch (e) {
        alert("Failed to load playlist.");
        setProgress(100);
    }
}

// 7. Queue System & Playback
function playSongFromQueue(list, index) {
    currentPlaylist = list;
    currentIndex = index;
    renderQueueList();
    const song = currentPlaylist[currentIndex];
    if (song) {
        fetchAndPlaySong(song.id);
    }
}

function renderQueueList() {
    queueList.innerHTML = "";
    currentPlaylist.forEach((song, idx) => {
        const item = document.createElement("div");
        item.className = `queue-item ${idx === currentIndex ? 'active' : ''}`;
        
        const title = sanitize(song.name || song.title || "Unknown");
        const artist = sanitize(getArtistNames(song) || "Music Player");
        const thumb = extractImage(song);

        item.innerHTML = `
            <img src="${thumb}" alt="${title}">
            <div class="queue-item-info">
                <h4>${title}</h4>
                <p>${artist}</p>
            </div>
            ${idx === currentIndex ? '<span style="color:var(--accent)">▶</span>' : ''}
        `;

        item.onclick = () => {
            currentIndex = idx;
            renderQueueList();
            fetchAndPlaySong(song.id);
        };

        queueList.appendChild(item);
    });
}

function playNextSong(isAutoEnded = false) {
    if (currentPlaylist.length === 0) return;

    if (isAutoEnded && repeatMode === 2) {
        audioSource.currentTime = 0;
        audioSource.play();
        return;
    }

    if (isShuffle && currentPlaylist.length > 1) {
        let nextIdx;
        do {
            nextIdx = Math.floor(Math.random() * currentPlaylist.length);
        } while (nextIdx === currentIndex);
        currentIndex = nextIdx;
    } else {
        if (currentIndex + 1 < currentPlaylist.length) {
            currentIndex++;
        } else {
            if (repeatMode === 1 || isShuffle) {
                currentIndex = 0;
            } else {
                audioSource.pause();
                vinylDisc.classList.remove("playing");
                playPauseBtn.innerText = "▶";
                return;
            }
        }
    }

    renderQueueList();
    fetchAndPlaySong(currentPlaylist[currentIndex].id);
}

function playPrevSong() {
    if (currentPlaylist.length === 0) return;
    if (audioSource.currentTime > 3) {
        audioSource.currentTime = 0;
        return;
    }
    if (isShuffle && currentPlaylist.length > 1) {
        let prevIdx;
        do {
            prevIdx = Math.floor(Math.random() * currentPlaylist.length);
        } while (prevIdx === currentIndex);
        currentIndex = prevIdx;
    } else {
        if (currentIndex - 1 >= 0) {
            currentIndex--;
        } else {
            currentIndex = currentPlaylist.length - 1;
        }
    }
    renderQueueList();
    fetchAndPlaySong(currentPlaylist[currentIndex].id);
}

async function fetchAndPlaySong(id) {
    try {
        setProgress(40);
        const res = await fetch(`${API_BASE}/songs?id=${id}`);
        const json = await res.json();
        setProgress(100);

        if (json.data && json.data.length > 0) {
            playTrack(json.data[0]);
        }
    } catch (e) {
        console.error("Audio playback error:", e);
        alert("Failed to play the song.");
        setProgress(100);
    }
}

function playTrack(song) {
    currentSongData = song;
    const downloadUrls = song.downloadUrl;
    if (!downloadUrls || downloadUrls.length === 0) {
        alert("Audio stream link not found!");
        return;
    }

    const audioUrl = downloadUrls[downloadUrls.length - 1].link;

    currentTitle.innerText = sanitize(song.name || song.title);
    currentArtist.innerText = sanitize(getArtistNames(song) || "Music Player");
    
    const thumbUrl = extractImage(song);
    currentThumb.src = thumbUrl;

    // Dynamically scan thumbnail for vibrant colors
    extractColorsFromImage(thumbUrl);

    audioSource.src = audioUrl;
    audioSource.play();
    playPauseBtn.innerText = "⏸";

    vinylDisc.classList.add("playing");
    fullscreenPlayer.classList.add("active");

    document.title = `Playing: ${currentTitle.innerText}`;
}

// 8. Player Controls
playPauseBtn.onclick = () => {
    if (!audioSource.src) return;
    if (audioSource.paused) {
        audioSource.play();
        playPauseBtn.innerText = "⏸";
        vinylDisc.classList.add("playing");
    } else {
        audioSource.pause();
        playPauseBtn.innerText = "▶";
        vinylDisc.classList.remove("playing");
    }
};

prevBtn.onclick = playPrevSong;
nextBtn.onclick = () => playNextSong(false);

shuffleBtn.onclick = () => {
    isShuffle = !isShuffle;
    shuffleBtn.classList.toggle("active", isShuffle);
    if (isShuffle) {
        shuffleIcon.src = "icon/suffel2.png";
        shuffleBtn.title = "Shuffle: On";
    } else {
        shuffleIcon.src = "icon/suffel1.png";
        shuffleBtn.title = "Shuffle: Off";
    }
};

repeatBtn.onclick = () => {
    repeatMode = (repeatMode + 1) % 3;
    if (repeatMode === 0) {
        repeatBtn.classList.remove("active");
        repeatIcon.src = "icon/repeat1.png";
        repeatBtn.title = "Repeat: Off";
    } else if (repeatMode === 1) {
        repeatBtn.classList.add("active");
        repeatIcon.src = "icon/repeat2.png";
        repeatBtn.title = "Repeat: All";
    } else if (repeatMode === 2) {
        repeatBtn.classList.add("active");
        repeatIcon.src = "icon/repeat3.png";
        repeatBtn.title = "Repeat: One";
    }
};

closePlayerBtn.onclick = () => {
    audioSource.pause();
    audioSource.currentTime = 0;
    playPauseBtn.innerText = "▶";
    progressBar.value = 0;
    currentTimeLabel.innerText = "0:00";
    vinylDisc.classList.remove("playing");
    fullscreenPlayer.classList.remove("active");
    queueDrawer.classList.remove("open");
    document.title = "Online Music Player";
};

queueToggleBtn.onclick = () => {
    queueDrawer.classList.toggle("open");
};
closeQueueBtn.onclick = () => {
    queueDrawer.classList.remove("open");
};

audioSource.ontimeupdate = () => {
    if (audioSource.duration) {
        const progress = (audioSource.currentTime / audioSource.duration) * 100;
        progressBar.value = progress;
        currentTimeLabel.innerText = formatTime(audioSource.currentTime);
        totalDurationLabel.innerText = formatTime(audioSource.duration);
    }
};

progressBar.oninput = () => {
    if (audioSource.duration) {
        audioSource.currentTime = (progressBar.value / 100) * audioSource.duration;
    }
};

audioSource.onended = () => {
    playNextSong(true);
};

// 9. Download with Metadata
downloadBtn.onclick = async () => {
    if (!currentSongData || !currentSongData.downloadUrl) return;

    const audioUrl = currentSongData.downloadUrl[currentSongData.downloadUrl.length - 1].link;
    const songName = sanitize(currentSongData.name || currentSongData.title || "song");
    const fileName = `${songName}.mp3`;
    const coverUrl = extractImage(currentSongData);

    try {
        setProgress(25);
        const [audioRes, imgRes] = await Promise.all([
            fetch(audioUrl),
            fetch(coverUrl)
        ]);

        setProgress(60);
        const songBuffer = await audioRes.arrayBuffer();
        const imgBuffer = await imgRes.arrayBuffer();
        setProgress(80);

        if (typeof ID3Writer !== "undefined") {
            const writer = new ID3Writer(songBuffer);
            writer.setFrame('TIT2', songName)
                  .setFrame('TPE1', [sanitize(getArtistNames(currentSongData) || "Unknown Artist")])
                  .setFrame('TALB', sanitize(currentSongData.album?.name || currentSongData.name || ""))
                  .setFrame('APIC', {
                      type: 3,
                      data: imgBuffer,
                      description: 'Cover Artwork'
                  });

            writer.addTag();
            const taggedBlob = writer.getBlob();
            const downloadLink = window.URL.createObjectURL(taggedBlob);
            const a = document.createElement("a");
            a.href = downloadLink;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadLink);
        } else {
            window.open(audioUrl, '_blank');
        }
        setProgress(100);
    } catch (err) {
        window.open(audioUrl, '_blank');
        setProgress(100);
    }
};

// 10. Light/Dark Mode
themeToggle.onclick = () => {
    document.body.classList.toggle("light-mode");
    themeToggle.innerText = document.body.classList.contains("light-mode") ? "☀️" : "🌙";
};

// 11. Search Events
searchBtn.onclick = () => searchAll(true);
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchAll(true);
});

// Launch App
loadHomePage(false);
