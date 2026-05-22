const axios = require('axios');

async function test() {
  console.log('Testing MiniMax with OpenAI-compatible endpoint...');
  
  try {
    const response = await axios.post(
      'https://api.minimax.chat/v1/text/chatcompletion_pro',
      {
        model: "minimax-M2.7",
        messages: [
          {
            role: "user",
            content: "Hello, write a short introduction about AI"
          }
        ]
      },
      {
        headers: {
          'Authorization': 'Bearer sk-cp-J0vXkXCZ-4udQbr7p4Cf9keo69SSxv0pr1vPIYvnTMTo0JaZDsWJwjqyINukOp3_qly4VFK7TGKe2sgCthXD7GJe-nhsdPkZ3bjlvUFFSEpBRRmZ0XTT5oc',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
        proxy: false,
      }
    );
    
    console.log('Success:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('Failed:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

test();