# Faraid Malayalam — Islamic Inheritance Calculator

<p align="center"><strong>A multilingual learning and calculation tool for exploring Islamic inheritance (Faraid).</strong></p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white">
  <img alt="Languages" src="https://img.shields.io/badge/Languages-ML%20%7C%20EN%20%7C%20TA%20%7C%20AR-0A6A4C">
</p>

Faraid Malayalam is a web project intended to make Islamic inheritance concepts and estate-share calculations easier to explore, especially for Malayalam-speaking users. Its guided interface introduces key concepts before collecting estate and heir information.

## Features

- **Four-language interface:** English, Malayalam, Tamil and Arabic.
- **Guided introduction:** Explains Faraid through introductory content, a hadith, a Qur’anic verse and core inheritance concepts.
- **Heir selection:** Provides 29 heir categories with multilingual labels and count inputs.
- **Estate details:** Supports cash and other assets, including land, gold and silver.
- **Estate deductions:** Includes fields for debts, funeral expenses and wasiyyah.
- **Share breakdown:** Presents inheritance shares and individual or group amounts.
- **Calculation concepts:** Models fixed shares (Furud), residuaries (Asabah), exclusion (Hajb), and adjustment concepts such as Aul and Radd.
- **AI-assisted calculation service:** Includes a Gemini API integration for additional calculation support.

## Technology

- React 19
- TypeScript
- Vite
- Google Gemini API integration through @google/genai

## Run Locally

**Prerequisite:** Node.js and npm.

1. Clone the repository:

        git clone https://github.com/strikerstring-web/FARAID-MALAYALAM.git
        cd FARAID-MALAYALAM

2. Install dependencies:

        npm install

3. Configure the Gemini API integration if you intend to use the AI-assisted calculation feature. Keep API credentials private. Do not commit a real key to Git or expose an unrestricted production key in browser code.

4. Start the development server:

        npm run dev

5. Run the TypeScript check:

        npm run lint

6. Create a production build:

        npm run build

## Important Disclaimer

This project is an educational and computational aid. Islamic inheritance cases can depend on detailed jurisprudential rules and the exact circumstances of the deceased and heirs. AI-generated results may be incomplete or incorrect. Do not use this project as the sole basis for distributing an actual estate; have every real case reviewed by a qualified inheritance scholar and, where appropriate, a legal professional.

## About

Created by **Muhammed Nabeel**.

- GitHub: [@strikerstring-web](https://github.com/strikerstring-web)
- Repository: [FARAID-MALAYALAM](https://github.com/strikerstring-web/FARAID-MALAYALAM)

<p align="center">Built to make inheritance knowledge more accessible.</p>
