import { NextRequest, NextResponse } from "next/server";

const PINATA_PIN_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_PIN_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

export async function POST(request: NextRequest) {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return NextResponse.json(
      { error: "Server missing PINATA_JWT. Add it in .env for IPFS uploads." },
      { status: 500 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing or invalid 'image' file" },
      { status: 400 },
    );
  }

  const name = (formData.get("name") as string) || "Base Art";

  try {
    const imageForm = new FormData();
    imageForm.append("file", file, "art.png");

    const pinRes = await fetch(PINATA_PIN_FILE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: imageForm,
    });

    if (!pinRes.ok) {
      const err = await pinRes.text();
      console.error("Pinata pinFile error:", err);
      return NextResponse.json(
        { error: "Failed to upload image to IPFS" },
        { status: 502 },
      );
    }

    const pinData = (await pinRes.json()) as { IpfsHash: string };
    const imageUri = `ipfs://${pinData.IpfsHash}`;

    const metadata = {
      name: name,
      description: "Hand-drawn art minted on Base",
      image: imageUri,
    };

    const metaRes = await fetch(PINATA_PIN_JSON, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: JSON.stringify(metadata),
    });

    if (!metaRes.ok) {
      const err = await metaRes.text();
      console.error("Pinata pinJSON error:", err);
      return NextResponse.json(
        { error: "Failed to upload metadata to IPFS" },
        { status: 502 },
      );
    }

    const metaData = (await metaRes.json()) as { IpfsHash: string };
    const metadataUri = `ipfs://${metaData.IpfsHash}`;

    return NextResponse.json({
      imageUri,
      metadataUri,
    });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
