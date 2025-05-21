document.addEventListener('DOMContentLoaded', async () => {
    const extractBtn = document.getElementById('extract');
    const downloadBtn = document.getElementById('download');
    const pageStatus = document.getElementById('page-status');
    const movieTitle = document.getElementById('movie-title');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const isMoviePage = tab.url.includes('einthusan') && tab.url.includes('/movie/');

    if (!isMoviePage) {
        setInvalidState();
        return;
    }

    try {
        const [{ result: movieData }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const vid = document.getElementById('UIVideoPlayer');
                if (!vid) return null;
                return {
                    title: vid.getAttribute('data-content-title'),
                    mpgLink: vid.getAttribute('data-mp4-link'),
                    hlsLink: vid.getAttribute('data-hls-link'),
                    contentId: vid.getAttribute('data-content-id')
                };
            }
        });

        if (!movieData) {
            setInvalidState('Movie element not found');
            return;
        }

        const { title, mpgLink } = movieData;
        setValidState(title);

        extractBtn.addEventListener('click', () => handleExtract(tab.id, mpgLink));
        downloadBtn.addEventListener('click', () => handleDownload(title, mpgLink));
    } catch (err) {
        console.error('Script execution error:', err);
        setInvalidState('Error accessing page');
    }

    function setValidState(title) {
        pageStatus.textContent = 'Yes';
        pageStatus.style.color = '#e31145';
        movieTitle.textContent = title || 'Movie detected';
        movieTitle.style.color = '#e31145';
    }

    function setInvalidState(reason = 'No Content Found') {
        pageStatus.textContent = 'No';
        movieTitle.textContent = reason;
    }

    async function handleExtract(tabId, link) {
        const originalHTML = extractBtn.innerHTML;
        extractBtn.innerHTML = '<i class="bi bi-hourglass-split button-icon"></i>Extracting...';
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                func: mpgLink => {
                    const videoData = mpgLink?.split('etv')[1];
                    if (videoData) {
                        window.open(`https://cdn1.einthusan.io/etv${videoData}`, '_blank');
                        return true;
                    }
                    return false;
                },
                args: [link]
            });
            extractBtn.innerHTML = '<i class="bi bi-check-circle button-icon"></i>Extracted!';
        } catch (error) {
            console.error('Extraction error:', error);
            extractBtn.innerHTML = '<i class="bi bi-exclamation-triangle button-icon"></i>Failed';
        } finally {
            setTimeout(() => (extractBtn.innerHTML = originalHTML), 2000);
        }
    }

    async function handleDownload(title, link) {
        const originalHTML = downloadBtn.innerHTML;
        downloadBtn.innerHTML = '<i class="bi bi-hourglass-split button-icon"></i>Processing...';
        try {
            const parts = link?.split('etv');
            if (parts?.length > 1) {
                const url = `https://cdn1.einthusan.io/etv${parts[1]}`;
                const filename = title ? `${title.replace(/[^\w\s]/g, '').replace(/\s+/g, '_')}.mp4` : 'einthusan_movie.mp4';

                await chrome.downloads.download({ url, filename });
                downloadBtn.innerHTML = '<i class="bi bi-check-circle button-icon"></i>Downloaded!';
            } else {
                throw new Error('Invalid video URL format');
            }
        } catch (error) {
            console.error('Download error:', error);
            downloadBtn.innerHTML = '<i class="bi bi-exclamation-triangle button-icon"></i>Failed';
        } finally {
            setTimeout(() => (downloadBtn.innerHTML = originalHTML), 2000);
        }
    }
});
