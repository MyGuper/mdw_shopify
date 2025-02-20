import { json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
  const { customerId, shop, amount } = await request.json();

  const session = await prisma.session.findFirst({ where: { shop } });
  const guper_session = await prisma.guper_session.findFirst({
    where: { shop },
  });
  const { accessToken } = session;
  const url = `https://${shop}/admin/api/2024-10/graphql.json`;

  const mutation = `mutation CreateDiscountCode($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode {
            id
            codeDiscount {
                ... on DiscountCodeBasic {
                title
                startsAt
                endsAt
                codes(first:1){
                    edges{
                    node{
                        code
                    }
                    }
                }
                customerSelection {
                    ... on DiscountCustomers {
                    customers {
                        id
                    }
                    }
                }
                customerGets {
                    value {
                    ... on DiscountPercentage {
                        percentage
                    }
                    }
                }
                }
            }
            }
            userErrors {
            field
            message
            }
        }
  }`;
  const variable = {
    basicCodeDiscount: {
      title: `A ${amount} Reward by guper`,
      code: `claim-reward-${customerId}-${Math.ceil(Math.random() * 1000)}`,
      startsAt: new Date().toISOString(),
      customerSelection: {
        customers: {
          add: [`gid://shopify/Customer/${customerId}`],
        },
      },
      customerGets: {
        value: {
          discountAmount: {
            amount,
            appliesOnEachItem: false,
          },
        },
        items: {
          all: true,
        },
      },
      usageLimit: 1,
      appliesOncePerCustomer: true,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query: mutation, variables: variable }),
    });
    const result = await response.json();

    const discountRes =
      result.data?.discountCodeBasicCreate.codeDiscountNode.codeDiscount;
    const discount = {
      title: discountRes.title,
      code: discountRes.codes.edges[0].node.code,
    };
    return json(
      {
        success: "discount created successfully",
        discount,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (error) {
    console.error("Error parsing JSON, response is not valid JSON");
    throw error;
  }
};
