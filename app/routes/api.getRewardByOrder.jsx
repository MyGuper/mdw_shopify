import { json } from "@remix-run/node";
import prisma from "../db.server";

// Create a new session with the Guper API
async function createNewSession() {
  const response = await fetch(
    `https://${process.env.GUPER_ACCOUNT}.myguper.com/api/connect/token`,
    {
      headers: {
        "x-guper-apikey": process.env.GUPER_API_KEY,
        "x-guper-apisecret": process.env.GUPER_API_SECRET,
      },
    },
  );

  // Make sure to await response.json()
  const data = await response.json();
  return { accessToken: data.accessToken, expiresIn: data.expiresIn };
}

// Fetch the reward info from Guper's loyalty API
async function getRewardInfo(
  guper_interface,
  shopId,
  client,
  items,
  accessToken,
) {
  const response = await fetch(
    `https://${process.env.GUPER_ACCOUNT}.myguper.com/api/loyalty/rewardByOrder`,
    {
      method: "POST",
      headers: {
        "x-guper-authorization": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        interface: guper_interface,
        storeId: shopId,
        client,
        items,
      }),
    },
  );

  // Get the raw text response
  const text = await response.text();

  // Try to parse it as JSON if possible
  try {
    const data = JSON.parse(text);
    return data;
  } catch (err) {
    console.error("Error parsing JSON, response is not valid JSON");
    throw err;
  }
}

// Remix action to handle the incoming POST request
export const action = async ({ request }) => {
  try {
    // Await the request JSON data
    const { data } = await request.json();

    const { shop, items, customer } = data;

    // Prepare client information using customer's email
    const client = { email: customer.email };
    const guper_interface = process.env.INTERFACE;
    let accessToken;

    // Find an existing session for the store
    let guperSession = await prisma.guper_session.findFirst({
      where: { shop: shop.name },
    });

    // Check if session doesn't exist or is expired.
    // Assuming guperSession.expired_at is stored as a timestamp.
    if (
      !guperSession ||
      !guperSession.accessToken ||
      new Date(guperSession.expired_at).getTime() < Date.now()
    ) {
      const newSession = await createNewSession();
      console.log("Authorizing", newSession);
      // const newExpiry = Date.now(); // Convert expiresIn (in seconds) to milliseconds

      if (guperSession) {
        // Update existing session
        await prisma.guper_session.update({
          where: { id: guperSession.id },
          data: {
            accessToken: newSession.accessToken,
            expired_at: newSession.expiresIn,
          },
        });
      } else {
        // Create a new session if one doesn't exist
        guperSession = await prisma.guper_session.create({
          data: {
            shop: shop.name,
            accessToken: newSession.accessToken,
            expired_at: newSession.expiresIn,
          },
        });
      }
      accessToken = newSession.accessToken;
    } else {
      accessToken = guperSession.accessToken;
    }

    console.log(accessToken);

    // Get the reward information from the Guper API
    const reward = await getRewardInfo(
      guper_interface,
      shop.id,
      client,
      items,
      accessToken,
    );

    console.log("Reward Info:", reward);

    // Return the reward data as a JSON response
    return json(
      { success: "Data fetched successfully", reward },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    return json(
      { error: "error fetching Data", error },
      { headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
};
