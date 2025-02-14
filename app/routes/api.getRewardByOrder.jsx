import prisma from "../db.server";

async function createNewSession() {
  const response = await fetch(
    `https://${process.env.GUPER_ACCOUNT}.myguper.com/api/connect/token`, {
      method: "POST",
      headers: {

      }
    }
  );

  const data = response.json()

}

export const action = async ({ request }) => {
  const { data } = request.json();
  const { shop, items } = data;
  const guperSession = await prisma.guper_session.findFirst({
    where: { shop },
  });

  if (
    !guperSession.accessToken ||
    !guperSession.expired_at ||
    guperSession.expired_at > Date.now()
  ) {
    await createNewSession();
  }
};
