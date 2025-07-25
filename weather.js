
// Preloader with proper timing (3 seconds)
window.addEventListener("load", () => {
  setTimeout(() => {
    document.querySelector(".preloader").classList.add("fade-out");
    setTimeout(() => {
      document.querySelector(".preloader").style.display = "none";
    }, 500);
  }, 3000); // Show preloader for 3 seconds
});

// Theme switcher
document.getElementById("theme-switch").addEventListener("change", function () {
  const theme = this.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
});

// Initialize theme
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  document.getElementById("theme-switch").checked = savedTheme === "dark";
});

const API_KEY = "71665f20352c039c7ed82d6ded37237e";

// Weather fetching with proper temperature display
async function fetchWeather(city) {
  const spinner = document.getElementById("spinner");
  const searchIcon = document.getElementById("search-icon");
  
  // Show spinner and hide search icon during loading
  spinner.classList.remove("hidden");
  searchIcon.classList.add("hidden");
  
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
    );
    const data = await response.json();
    if (data.cod !== 200) throw new Error(data.message);
    updateWeatherUI(data);
  } catch (error) {
    alert("City not found");
    console.error(error);
  } finally {
    // Restore search icon and hide spinner
    spinner.classList.add("hidden");
    searchIcon.classList.remove("hidden");
  }
}

// Updated weather UI with improved date formatting
function updateWeatherUI(data) {
  document.querySelector(".city-name").textContent = `${data.name}, ${data.sys.country}`;
  
  // Calculate city local time with proper timezone offset
  const now = new Date();
  const localOffset = now.getTimezoneOffset() * 60000; // Local timezone offset in ms
  const cityOffset = data.timezone * 1000; // City timezone offset in ms
  const cityTime = new Date(now.getTime() + localOffset + cityOffset);
  
  // Format options
  const dateOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  };
  
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };
  
  // Format date and time separately
  const formattedDate = cityTime.toLocaleDateString('en-US', dateOptions);
  const formattedTime = cityTime.toLocaleTimeString('en-US', timeOptions);
  
  // Combine them for display
  document.querySelector(".date-time").textContent = `${formattedDate} • ${formattedTime}`;
  
  // Temperature display
  document.querySelector(".temperature").textContent = Math.round(data.main.temp);
  document.querySelector(".description").textContent = data.weather[0].description;
  document.querySelector(".feels-like").textContent = `${Math.round(data.main.feels_like)}°C`;
  document.querySelector(".humidity").textContent = `${data.main.humidity}%`;
  document.querySelector(".wind-speed").textContent = `${data.wind.speed} m/s`;
  document.querySelector(".pressure").textContent = `${data.main.pressure} hPa`;

  const iconCode = data.weather[0].icon;
  const iconClass = getIconClass(data.weather[0].main.toLowerCase());
  const weatherIcon = document.querySelector(".weather-icon i");

  weatherIcon.className = `fas ${iconClass}`;
  document.getElementById("weather-result").classList.remove("hidden");
}


function getIconClass(condition) {
  switch (condition) {
    case "clouds":
      return "fa-cloud";
    case "rain":
    case "drizzle":
      return "fa-cloud-showers-heavy";
    case "thunderstorm":
      return "fa-bolt";
    case "snow":
      return "fa-snowflake";
    case "clear":
      return "fa-sun";
    case "mist":
    case "fog":
    case "haze":
      return "fa-smog";
    default:
      return "fa-question";
  }
}

// 5-Day Forecast Feature
document.getElementById('weather-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const cityInput = document.getElementById('city-input');
  const city = cityInput.value.trim();
  if (city) {
    await fetchWeather(city);
    await get5DayForecast(city);
    cityInput.value = '';
  }
});

async function get5DayForecast(city) {
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    updateForecastUI(data);
  } catch (error) {
    console.error("Error fetching forecast:", error);
  }
}

function updateForecastUI(data) {
  const forecastCards = document.querySelector('.forecast-cards');
  const forecastSection = document.querySelector('.forecast-container');
  forecastCards.innerHTML = '';

  const dailyForecasts = data.list.filter(f => f.dt_txt.includes("12:00:00"));

  dailyForecasts.forEach(forecast => {
    const date = new Date(forecast.dt_txt);
    const day = date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });

    const temp = Math.round(forecast.main.temp);
    const icon = forecast.weather[0].icon;
    const description = forecast.weather[0].description;
    const main = forecast.weather[0].main.toLowerCase();

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
        <h4>${day}</h4>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
        <p>${temp}°C</p>
        <p>${description}</p>
    `;

    // Set background color by weather condition
    let bgColor;
    switch (main) {
      case 'clear': bgColor = '#ffe680'; break;
      case 'clouds': bgColor = '#d3d3d3'; break;
      case 'rain':
      case 'drizzle': bgColor = '#a0c4ff'; break;
      case 'thunderstorm': bgColor = '#b197fc'; break;
      case 'snow': bgColor = '#ffffff'; break;
      case 'mist':
      case 'fog':
      case 'haze': bgColor = '#e0e0e0'; break;
      default: bgColor = '#f0f0f0';
    }

    card.style.backgroundColor = bgColor;
    forecastCards.appendChild(card);
  });

  forecastSection.classList.remove('hidden');
}

// Autocomplete and geolocation
const cityInput = document.getElementById('city-input');
const suggestionsBox = document.getElementById('suggestions');

cityInput.addEventListener('input', async function () {
  const value = this.value.trim();
  suggestionsBox.innerHTML = '';

  if (value.length < 2) return;

  try {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${value}&limit=5&appid=${API_KEY}`);
    const cities = await response.json();

    cities.forEach(city => {
      const suggestion = document.createElement('div');
      suggestion.className = 'suggestion-item';
      suggestion.textContent = `${city.name}, ${city.country}`;
      suggestion.addEventListener('click', async () => {
        cityInput.value = city.name;
        await fetchWeather(city.name);
        await get5DayForecast(city.name);
        suggestionsBox.innerHTML = '';
      });
      suggestionsBox.appendChild(suggestion);
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
  }
});

// Geolocation-based fetch on load
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async position => {
    const { latitude, longitude } = position.coords;
    try {
      const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
      const data = await response.json();
      updateWeatherUI(data);
      await get5DayForecast(data.name);
    } catch (error) {
      console.error('Geolocation fetch error:', error);
    }
  });
}

// Copyright footer
document.getElementById("copyright").textContent = `© ${new Date().getFullYear()} WeatherSphere`;