import prisma from "../db.server";
import { authenticate } from "../shopify.server";

export const action = async ({ request }) => {
  // Authenticate the webhook request from Shopify
  const { shop, payload } = await authenticate.webhook(request);
  const { id, note } = payload;

  // Retrieve the access token from the guper_session for the shop
  const session = await prisma.guper_session.findFirst({
    where: { shop },
  });

  if (!session) {
    console.error(`No session found for shop ${shop}`);
    return new Response("Session not found", { status: 404 });
  }

  const { accessToken } = session;

  // Check if the note contains the expected token format
  if (note.includes("guper-")) {
    // Extract token from the note (e.g. "guper-ABC123" -> "ABC123")
    const token = note.split("-").pop();
    const url = `https://${process.env.GUPER_ACCOUNT}.myguper.com/api/loyalty/confirmOrder/${token}`;

    const payloadToSend = {
      id,
      waitSettlement: true,
    };

    try {
      // Send the confirmation request to the Guper API
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-guper-authorization": accessToken,
        },
        body: JSON.stringify(payloadToSend),
      });

    //   if (!response.ok) {
    //     const errorText = await response.text();
    //     console.error("Error confirming order:", errorText);
    //     return new Response(`Error confirming order: ${response.status}`, {
    //       status: response.status,
    //     });
    //   }

      const data = await response.json();
      console.log(data);
      return new Response({ status: 200 });
    } catch (error) {
      console.error("Fetch error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  } else {
    // If the note does not include a guper token, simply return a 200 response
    return new Response("No guper token found in note", { status: 200 });
  }
};
