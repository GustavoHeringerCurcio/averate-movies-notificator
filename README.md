# IMDB-SCRAPER Dashboard 🎬

A web application designed to track movies currently playing in cinemas, aggregate their review scores, and notify users about highly-rated films. 

The core feature is the **"SuperNota"**—an aggregated average score calculated from major review platforms to quickly determine if a movie is worth watching.

## 🎯 The Problem

I enjoy watching movies at the cinema, but I often miss good releases because I don't actively track what is currently playing or manually search for their ratings. If I knew a highly-rated movie was in theaters, I would go watch it. 

## 💡 The Solution

This project automates the discovery process. It identifies currently playing movies, scrapes their ratings across major platforms, calculates a unified "SuperNota," and organizes them on a clean dashboard. In the future, it will send automated WhatsApp alerts when a movie surpasses a user-defined score threshold.

## 🚀 Current Status

The project is in early development. Currently implemented:
* **Frontend Dashboard:** A basic UI built with Next.js displaying movies.
* **Web Scraping:** Puppeteer is configured to scrape scores from IMDb and Rotten Tomatoes.
* **API Integration:** Fetching movie posters and additional metadata using the OMDb API.
* **Data State:** The initial movie list is currently mocked for testing purposes.

## 🛠 Tech Stack

**Current:**
* **Frontend:** Next.js, React, Tailwind CSS
* **Backend/Scraping:** Node.js, Puppeteer
* **External APIs:** OMDb API

**Planned Infrastructure (Self-Hosted):**
* **Server:** DigitalOcean VPS (Student Pack)
* **Automation:** n8n
* **Messaging:** Evolution API (WhatsApp integration)

## 🗺 Roadmap & Planned Features

- [x] Create basic Next.js dashboard UI.
- [x] Implement Puppeteer scraping for IMDb and Rotten Tomatoes.
- [x] Fetch movie posters via OMDb API.
- [ ] **Dynamic Movie List:** Replace mocked data with a live feed of "Currently in Theaters" movies.
- [ ] **Metascore Integration:** Add Metascore to the web scraper.
- [ ] **SuperNota Calculation:** Implement the logic to average the three scores into the main branding metric.
- [ ] **Sorting:** Automatically sort the dashboard from highest SuperNota to lowest.
- [ ] **WhatsApp Notifications:** Allow users to set a threshold (e.g., > 7) and receive alerts via Evolution API and n8n.
- [ ] **Deployment:** Set up a DigitalOcean VPS to host the application and scraping scripts.

## 💻 How to Run Locally

1. Clone the repository:
   ```bash
   git clone [https://github.com/yourusername/supernota-dashboard.git](https://github.com/yourusername/supernota-dashboard.git)
