import { json } from "@remix-run/node";
import prisma from "../db.server";

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

  const data = await response.json();
  return { accessToken: data.accessToken, expiresIn: data.expiresIn };
}

async function getRewardInfo(
  guper_interface,
  shopId,
  client,
  items,
  accessToken,
  totalItems,
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
        total_item: totalItems,
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

export const action = async ({ request }) => {
  console.log(1);

  try {
    const { data } = await request.json();

    const { shop, items, customer } = data;

    const client = { email: customer.email };
    const guper_interface = process.env.INTERFACE;
    let accessToken;

    let guperSession = await prisma.guper_session.findFirst({
      where: { shop: shop.name },
    });

    if (
      !guperSession ||
      !guperSession.accessToken ||
      new Date(guperSession.expired_at).getTime() < Date.now()
    ) {
      const newSession = await createNewSession();

      if (guperSession) {
        await prisma.guper_session.update({
          where: { id: guperSession.id },
          data: {
            accessToken: newSession.accessToken,
            expired_at: newSession.expiresIn,
          },
        });
      } else {
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

    let totalItems = 0;

    items.forEach((item) => {
      console.log({ item });
      totalItems = totalItems + Number(item.quantity);
    });
    console.log({ totalItems });
    const reward = await getRewardInfo(
      guper_interface,
      shop.id,
      client,
      items,
      accessToken,
      totalItems,
    );

    return Response.json(
      { success: "Data fetched successfully", reward },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    return Response.json(
      { error: "error fetching Data", errorMsg: error },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};
