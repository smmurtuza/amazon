const { test, expect, chromium } = require('@playwright/test');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fs = require('fs');

//for run the code run command in terminal it will generate report in test-results folder "npx playwright test --grep "buy a product" --headed --reporter=html"

// Function to preprocess image using sharp
async function preprocessImage(inputPath, outputPath) {
  await sharp(inputPath)
    .grayscale() // Convert to grayscale
    .threshold(128) // Apply threshold to remove noise
    .toFile(outputPath);
}

// Function to extract text from an image using Tesseract
async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => console.log(m) // Optional: display progress
    });
    return text.trim();
  } catch (error) {
    console.error("Error extracting text from image:", error);
    return ""; // Return an empty string if OCR fails
  }
}

test('Buy a product', async ({ page }) => {
  test.setTimeout(60000); // Increase timeout to 60 seconds

  // Step 1: Navigate to Amazon Home Page
  await page.goto('https://www.amazon.com');

  // Step 2: Check for CAPTCHA Presence
  const captchaPresent = await page.$('form img');
  if (captchaPresent) {
    console.log("CAPTCHA detected. Attempting to solve...");

    // Wait for the CAPTCHA to load properly
    await page.waitForTimeout(2000); // Wait for 2 seconds

    // Check if CAPTCHA is visible and scroll it into view if necessary
    const isCaptchaVisible = await captchaPresent.isVisible();
    if (!isCaptchaVisible) {
      console.log("CAPTCHA is not visible. Trying to scroll into view...");
      try {
        await captchaPresent.scrollIntoViewIfNeeded();
        console.log("Scrolled CAPTCHA into view.");
      } catch (scrollError) {
        console.error("Failed to scroll CAPTCHA into view: ", scrollError);
        await page.pause();
        return;
      }
    }

    // Capture a screenshot of the captcha image
    const captchaImagePath = 'captcha.png';
    try {
      await captchaPresent.screenshot({ path: captchaImagePath });
    } catch (screenshotError) {
      console.error("Error capturing CAPTCHA screenshot: ", screenshotError);
      await page.pause(); // Pause for manual intervention if needed
      return;
    }

    // Preprocess image and extract text
    const preprocessedImagePath = 'captcha_preprocessed.png';
    await preprocessImage(captchaImagePath, preprocessedImagePath);
    const captchaText = await extractTextFromImage(preprocessedImagePath);
    console.log("Extracted Captcha Text:", captchaText);

    // Check if captcha text was successfully extracted
    if (!captchaText) {
      console.log("Failed to extract captcha text. Please solve the captcha manually.");
      await page.pause();
      return;
    }

    // Fill the captcha input field
    await page.fill('input[placeholder="Type characters"]', captchaText);

    // Click on "Continue Shopping" button (adjust the selector as needed)
    try {
      await page.click('button:has-text("Continue shopping")');
      console.log("Continue button clicked, proceeding with automation.");
    } catch (error) {
      console.log("Error clicking Continue button. Captcha text might be incorrect.");
    }
  } else {
    console.log("No CAPTCHA detected. Proceeding with the next steps...");
  }

  // Step 3: Navigate to the Product Page Directly After Bypassing CAPTCHA
  await page.goto('https://www.amazon.com/Amazon-Basics-Microphone-Podcasting-Adjustable/dp/B0CL9BTQRF/ref=sr_1_1_ffob_sspa?crid=KIMJZG44X58H&dib=eyJ2IjoiMSJ9.3glZjBc6B5SxGupTsYPIOFINtdc3yxIw14ElZgEP7sG0JgC3BbFIwAOKhMaicHutXkjqvvsDo44O0Pm9TswEI1q1mSxqD8mboSlIer_eJuGgYpuWuYiVgchr7f--2lpM8DoKHpHy3vspWlBlGdY9Fj0V5pU0GMLq0Slhe_Io04Dhjidp42pOkqa_8h2B-pZ49yRhbur475fErVZSJ9yhyUKukZqtXhXBfc-9BJ1Fi84yiUf0D6BGAlYYrryabb3kyT_T-H7Um07OtA10NK4reDD60GYyN0MKW_wTaON1214.O_XL7AvI7KKC7rV1RuUXxm5hCaw7kVqAIglAQDlExRw&dib_tag=se&keywords=gaming&qid=1726757712&sprefix=gaming%2Caps%2C289&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1');

  // Step 4: Add Product to Cart and Proceed to Checkout
  try {
    await page.waitForSelector('#add-to-cart-button', { timeout: 10000 });
    await page.click('#add-to-cart-button');
    console.log("Product added to cart.");
  } catch (error) {
    console.error("Error clicking 'Add to cart' button: ", error);
    return;
  }

  // Fill in email or phone number
  try {
    await page.waitForSelector('input[value="Proceed to checkout"]');
    await page.click('input[value="Proceed to checkout"]');
    await page.waitForSelector('input[name="email"]');
    await page.fill('input[name="email"]', 'dt.murtuza@gmail.com');
  } catch (error) {
    console.error("Error during checkout steps: ", error);
    return;
  }

  // Click on 'Continue' button
  try {
    await page.waitForSelector('.a-button-input');
    await page.click('.a-button-input');
  } catch (error) {
    console.error("Error clicking 'Continue' button: ", error);
    return;
  }

  // Fill in password and sign in
  try {
    await page.waitForSelector('#ap_password', { timeout: 10000 });
    await page.fill('#ap_password', '101010');
    await page.click('.a-button-input'); // Click the sign-in button
  } catch (error) {
    console.error("Error during sign-in steps: ", error);
    return;
  }

  // Further steps if needed...
  // Click on 'Add a credit or debit card'
  try {
    await page.waitForSelector('role=link[name="Add a credit or debit card"]', { timeout: 10000 });
    await page.getByRole('link', { name: 'Add a credit or debit card' }).click();
  } catch (error) {
    console.error("Error clicking 'Add a credit or debit card': ", error);
    return;
  }

  await page.waitForTimeout(2000);

  console.log('Test completed successfully');
});
