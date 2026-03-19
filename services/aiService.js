const axios = require("axios");

async function askCookingAssistant(userMessage) {

  try {

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3-8b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful cooking assistant helping users cook recipes."
          },
          {
            role: "user",
            content: userMessage
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.data || !response.data.choices) {
      console.log("Invalid OpenRouter response:", response.data);
      throw new Error("AI response format invalid");
    }

    return response.data.choices[0].message.content;

  } catch (error) {

    console.log(
      "OpenRouter error:",
      error.response?.data || error.message
    );

    throw error;
  }
}

module.exports = { askCookingAssistant };