document.addEventListener('DOMContentLoaded', function() {
    // Preloader
    const preloader = document.querySelector('.preloader');
    
    // Hide preloader when page loads
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.classList.add('fade-out');
            setTimeout(() => {
                preloader.style.display = 'none';
            }, 500);
        }, 1000);
    });

    // Theme switcher
    const themeSwitch = document.getElementById('theme-switch');
    themeSwitch.addEventListener('change', function() {
        if(this.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // Check for saved theme preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme) {
        document.documentElement.setAttribute('data-theme', currentTheme);
        if (currentTheme === 'dark') {
            themeSwitch.checked = true;
        }
    }

    // Weather form elements
    const weatherForm = document.getElementById('weather-form');
    const cityInput = document.getElementById('city-input');
    const suggestionsContainer = document.getElementById('suggestions');
    const searchIcon = document.getElementById('search-icon');
    const spinner = document.getElementById('spinner');
    const weatherResult = document.getElementById('weather-result');
    const forecastContainer = document.querySelector('.forecast-container');
    const apiKey = '71665f20352c039c7ed82d6ded37237e';

    // Debounce function to limit API calls
    function debounce(func, delay) {
        let timeoutId;
        return function() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(func, delay);
        };
    }

    // Fetch city suggestions
    const fetchSuggestions = debounce(async () => {
        const query = cityInput.value.trim();
        if (query.length < 2) {
            suggestionsContainer.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`);
            const data = await response.json();
            
            if (data.length > 0) {
                suggestionsContainer.innerHTML = data.map(city => `
                    <div class="suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}">
                        ${city.name}, ${city.country} ${city.state ? `, ${city.state}` : ''}
                    </div>
                `).join('');
                suggestionsContainer.style.display = 'block';
            } else {
                suggestionsContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            suggestionsContainer.style.display = 'none';
        }
    }, 300);

    cityInput.addEventListener('input', fetchSuggestions);

    // Handle suggestion selection
    suggestionsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-item')) {
            const cityName = e.target.textContent.split(',')[0].trim();
            cityInput.value = cityName;
            suggestionsContainer.style.display = 'none';
            weatherForm.dispatchEvent(new Event('submit'));
        }
    });

    // Hide suggestions when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsContainer.style.display = 'none';
        }
    });

    // Form submission with loading indicator
    weatherForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        searchIcon.classList.add('hidden');
        spinner.classList.remove('hidden');
        
        const city = cityInput.value.trim();
        
        try {
            await getWeatherData(city);
            await getForecastData(city);
            
            weatherResult.classList.remove('hidden');
            forecastContainer.classList.remove('hidden');
        } catch (error) {
            weatherResult.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${error.message}</p>
                </div>
            `;
            weatherResult.classList.remove('hidden');
        } finally {
            // Hide loading state
            searchIcon.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    });

    // Get weather data from API
    async function getWeatherData(city) {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch weather data");
        }
        
        updateWeatherUI(data);
    }

    // Get forecast data from API
    async function getForecastData(city) {
        const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&cnt=40`; // Get more items for 5-day forecast
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || "Failed to fetch forecast data");
        }
        
        updateForecastUI(data);
    }

    // Update UI with weather data
    function updateWeatherUI(data) {
        const weather = data.weather[0];
        
        // Convert timestamp with timezone offset (seconds to milliseconds)
        const localTime = new Date((data.dt + data.timezone) * 1000);
        
        // Format options
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'UTC'
        };
        
        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        };
        
        const formattedTime = localTime.toLocaleTimeString('en-US', timeOptions);
        const formattedDate = localTime.toLocaleDateString('en-US', dateOptions);
        
        // Update main weather info
        document.querySelector('.city-name').textContent = `${data.name}, ${data.sys.country}`;
        document.querySelector('.date-time').textContent = `${formattedDate} • ${formattedTime}`;
        document.querySelector('.temperature').textContent = Math.round(data.main.temp_max);
        document.querySelector('.description').textContent = weather.description;
        
        // Update weather icon
        const iconMap = {
            '01': 'fa-sun',       // clear sky
            '02': 'fa-cloud-sun',  // few clouds
            '03': 'fa-cloud',      // scattered clouds
            '04': 'fa-cloud',      // broken clouds
            '09': 'fa-cloud-rain', // shower rain
            '10': 'fa-cloud-rain', // rain
            '11': 'fa-bolt',       // thunderstorm
            '13': 'fa-snowflake',  // snow
            '50': 'fa-smog'        // mist
        };
        
        const weatherIcon = document.querySelector('.weather-icon i');
        const iconCode = weather.icon.substring(0, 2);
        weatherIcon.className = `fas ${iconMap[iconCode]}`;
        weatherIcon.style.color = getIconColor(iconCode);
        
        // Update weather details
        document.querySelector('.feels-like').textContent = `${Math.round(data.main.feels_like)}°C`;
        document.querySelector('.humidity').textContent = `${data.main.humidity}%`;
        document.querySelector('.wind-speed').textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
        document.querySelector('.pressure').textContent = `${data.main.pressure} hPa`;
    }

    // Update forecast UI
function updateForecastUI(data) {
    const forecastCards = document.querySelector('.forecast-cards');
    forecastCards.innerHTML = '';
    
    // Get one forecast per day (approximately 24 hours apart)
    const dailyForecasts = [];
    const daysAdded = new Set();
    
    // Get the local midnight time for the city
    const now = new Date();
    const localOffset = now.getTimezoneOffset() * 60 * 1000; // Local timezone offset in ms
    const cityOffset = data.city.timezone * 1000; // City timezone offset in ms
    const cityNow = new Date(now.getTime() + localOffset + cityOffset);
    
    data.list.forEach(forecast => {
        // Convert forecast time to city's local time
        const forecastTime = new Date((forecast.dt + data.city.timezone) * 1000);
        
        // Only consider forecasts starting from tomorrow
        if (forecastTime.getDate() === cityNow.getDate()) return;
        
        // Use just the date portion (without time) as the key
        const dateKey = forecastTime.toISOString().split('T')[0];
        
        if (!daysAdded.has(dateKey)) {
            daysAdded.add(dateKey);
            dailyForecasts.push(forecast);
            
            // Stop when we have 5 days
            if (dailyForecasts.length >= 5) return;
        }
    });
    
    // Fallback if we didn't get enough forecasts
    if (dailyForecasts.length < 5) {
        // Get the first forecast for each available day
        const seenDays = new Set();
        for (const forecast of data.list) {
            const forecastTime = new Date((forecast.dt + data.city.timezone) * 1000);
            const dateKey = forecastTime.toISOString().split('T')[0];
            
            if (!seenDays.has(dateKey)) {
                seenDays.add(dateKey);
                dailyForecasts.push(forecast);
                
                if (dailyForecasts.length >= 5) break;
            }
        }
    }
    
    // Create forecast cards
    dailyForecasts.forEach(forecast => {
        const forecastTime = new Date((forecast.dt + data.city.timezone) * 1000);
        const day = forecastTime.toLocaleDateString('en-US', { 
            weekday: 'short',
            timeZone: 'UTC'
        });
        
        const weather = forecast.weather[0];
        const iconCode = weather.icon.substring(0, 2);
        
        const forecastCard = document.createElement('div');
        forecastCard.className = 'forecast-card';
        forecastCard.innerHTML = `
            <div class="forecast-day">${day}</div>
            <div class="forecast-icon">
                <i class="fas ${getIconClass(iconCode)}" style="color: ${getIconColor(iconCode)}"></i>
            </div>
            <div class="forecast-temp">
                <span class="max-temp">${Math.round(forecast.main.temp_max)}°</span>
                <span class="min-temp">${Math.round(forecast.main.temp_min)}°</span>
            </div>
        `;
        
        forecastCards.appendChild(forecastCard);
    });
}

    // Helper function to get icon class
    function getIconClass(iconCode) {
        const iconMap = {
            '01': 'fa-sun',
            '02': 'fa-cloud-sun',
            '03': 'fa-cloud',
            '04': 'fa-cloud',
            '09': 'fa-cloud-rain',
            '10': 'fa-cloud-rain',
            '11': 'fa-bolt',
            '13': 'fa-snowflake',
            '50': 'fa-smog'
        };
        return iconMap[iconCode] || 'fa-question';
    }

    // Helper function to get icon color
    function getIconColor(iconCode) {
        const colorMap = {
            '01': '#FFD700', // sun - gold
            '02': '#FFA500', // cloud-sun - orange
            '03': '#A9A9A9', // cloud - dark gray
            '04': '#778899', // clouds - light slate gray
            '09': '#4682B4', // rain - steel blue
            '10': '#1E90FF', // rain - dodger blue
            '11': '#9400D3', // thunder - dark violet
            '13': '#FFFFFF', // snow - white
            '50': '#D3D3D3'  // mist - light gray
        };
        return colorMap[iconCode] || '#4361ee';
    }

    // Get user's current location weather
    function getCurrentLocationWeather() {
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async position => {
                    try {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
                        
                        const response = await fetch(url);
                        const data = await response.json();
                        
                        if (!response.ok) {
                            throw new Error(data.message || "Failed to fetch weather data");
                        }
                        
                        cityInput.value = data.name;
                        updateWeatherUI(data);
                        await getForecastData(data.name);
                        
                        weatherResult.classList.remove('hidden');
                        forecastContainer.classList.remove('hidden');
                    } catch (error) {
                        console.error('Error fetching location weather:', error);
                        getWeatherData('New York'); // Default city
                    }
                },
                error => {
                    console.error('Error getting location:', error);
                    getWeatherData('New York'); // Default city
                }
            );
        } else {
            getWeatherData('New York'); // Default city
        }
    }

    // Initialize with current location or default city
    getCurrentLocationWeather();

    // Update copyright year
    document.getElementById('copyright').innerHTML = 
        `&copy; ${new Date().getFullYear()} WeatherSphere. Powered by OpenWeatherMap API.`;
});