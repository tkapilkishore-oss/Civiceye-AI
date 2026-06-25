async function runChatTest() {
  console.log("Sending test civic question to http://localhost:3000/api/chat...");
  try {
    const resCivic = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Who should I call for a water leak?" }
        ]
      })
    });
    const dataCivic = await resCivic.json();
    console.log("\n--- CIVIC QUERY REPLY ---");
    console.log(dataCivic.content);

    console.log("\nSending test off-topic question to http://localhost:3000/api/chat...");
    const resOffTopic = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Give me a recipe for chocolate chip cookies" }
        ]
      })
    });
    const dataOffTopic = await resOffTopic.json();
    console.log("\n--- OFF-TOPIC QUERY REPLY ---");
    console.log(dataOffTopic.content);

  } catch (err) {
    console.error("Failed to connect to local server. Make sure dev server is running on port 3000:", err.message);
  }
}

runChatTest();
