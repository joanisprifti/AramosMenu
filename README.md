# AramosMenu

> A mobile‑friendly web menu for **Aramos Beach Bar**, enabling customers to scan a QR code and instantly view the menu in Greek or English. Hosted via AWS Amplify for fast, reliable delivery. 

[Live Demo » (Click here)](https://main.demk8o6naor0f.amplifyapp.com/)

## 📋 Table of Contents

1. [Overview](#overview)  
2. [Features](#🔥-features)  
3. [Screenshots](#🖼️-screenshots)  
4. [Technologies](#🛠️-technologies)  
5. [Installation & Usage](#🚀-installation--usage)  
6. [Deployment](#📦-deployment)  
7. [License](#📄-license)  
8. [Contact](#📬-contact)  
9. [Acknowledgements](#🙏-acknowledgements)  
10. [Changelog](#📝-changelog)  

## Overview

- **Purpose:** Replace printed menus with a responsive, multi‑language web menu accessible via QR code.  
- **Stack:** HTML5, CSS3, JavaScript (ES6), AWS Amplify.

## 🔥 Features

- **QR‑driven access**: Customers scan a QR code and view the menu instantly on any smartphone.
- **Dual‑language support**: Toggle between Greek and English with one click. 
- **Responsive design**: Adapts seamlessly to all mobile screen sizes.
- **Lightweight and fast**: Pure HTML/CSS/JavaScript—no heavy frameworks.
- **Easy maintenance**: Content driven by a simple JSON menu file for quick updates. 

## 🖼️ Screenshots

<p align="center">  
  <img src="https://github.com/johnprif/AramosMenu/assets/56134761/7bd8f198-1717-434b-a32a-3f7ff80747be" alt="Menu English view" width="300"/>  
  <img src="https://github.com/johnprif/AramosMenu/assets/56134761/297dc7a3-bf1d-42c1-b125-2b288101b266" alt="Menu Greek view" width="300"/>  
</p>  
<p align="center">  
  <img src="https://github.com/johnprif/AramosMenu/assets/56134761/c251b094-99d3-4d10-9257-4ee856641436" alt="QR Code" width="150"/>  
</p>

## 🛠️ Technologies

- **Frontend:** HTML5, CSS3, JavaScript (ES6)
- **Hosting:** AWS Amplify (static web hosting)
- **Build tools:** None (vanilla JS); deployed via Amplify CLI

<!-- ## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:  
- A modern web browser (Chrome, Safari, Firefox) :contentReference[oaicite:9]{index=9}  
- (Optional) AWS CLI & Amplify CLI configured for deployments :contentReference[oaicite:10]{index=10}   -->

## 🚀 Installation & Usage

1. **Clone the repo**  
   ```bash
   git clone https://github.com/johnprif/AramosMenu.git
   cd AramosMenu

2. **Open** the menu in your browser  
   - Click [index.html](https://github.com/johnprif/AramosMenu/blob/main/index.html) to preview the page

3. **Edit** the source files as needed:  
   1. [index.html](https://github.com/johnprif/AramosMenu/blob/main/index.html) — update menu structure, items & prices
   2. [style.css](https://github.com/johnprif/AramosMenu/blob/main/style.css) — customize layout, colors & typography
   3. [script.js](https://github.com/johnprif/AramosMenu/blob/main/script.js) — adjust language‑toggle logic and pricing calculations

## 📦 Deployment
This site uses AWS Amplify's **continuous deployment** from this repository: whenever you push to the main branch, Amplify automatically builds and publishes the latest version. No local‑CLI install or manual “amplify publish” is required—updates appear live within seconds of your Git commit.

To set up or review Github connection in the Amplify Console:

1. **Open the Amplify Console** in the AWS Management Console and select your AramosMenu app (or choose **Host web app** ▶︎ **GitHub**).  
2. **Authorize** the AWS Amplify GitHub App (if not already)—grant it access to the specific repo and branch (e.g. `main`).  
3. **Verify build settings** under **App settings ▶︎ Build settings**; Amplify uses a default build specification (`amplify.yml`) suitable for static HTML/CSS/JS apps.  
4. **Push changes** to GitHub. Amplify’s CI/CD pipeline will detect the commit, execute the build, and deploy to the Amplify‑provided CDN domain automatically.

If you ever need to adjust the build or add custom redirects, you can edit the **amplify.yml** directly in the Amplify Console or in your repo root. For custom domains or HTTPS settings, configure under **App settings ▶︎ Domain management** in the Amplify Console.  

## 📄 License
This project is licensed under the **Apache License 2.0**. See [LICENSE](https://github.com/johnprif/AramosMenu/blob/main/LICENSE).

## 📬 Contact
John Priftis
- GitHub: [johnprif](https://github.com/johnprif)
- Email: [giannispriftis37@gmail.com](mailto:giannispriftis37@gmail.com)
- Phone: [+306940020178](tel:+306940020178)

## 🙏 Acknowledgements
- **[othneildrew/Best-README-Template](https://www.hatica.io/blog/best-practices-for-github-readme/?utm_source=chatgpt.com)** for structure inspiration.
- **[FreeCodeCamp](https://github.com/Louis3797/awesome-readme-template?utm_source=chatgpt.com)** article on witing good READMEs
- **[GitHub Docs](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax?utm_source=chatgpt.com)** on basic Markdown syntax and TOC support.
- **[Hatica blog](https://www.hatica.io/blog/best-practices-for-github-readme/?utm_source=chatgpt.com)** on eye-catching README design.

## 📝 Changelog
- **v1.0** (2023-06-25): Initial release with QR-menu, dual-language support, AWS hosting.
- **v1.1** (2023-06-28): Update logo
- **v1.2** (2025-05/08): Small visual updates



