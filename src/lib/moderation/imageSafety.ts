// Blocks a listing photo or profile picture before it's ever stored, using
// AWS Rekognition's moderation labels. Requires AWS_REKOGNITION_ACCESS_KEY_ID,
// AWS_REKOGNITION_SECRET_ACCESS_KEY, and AWS_REKOGNITION_REGION — if any is
// missing, or the API call itself fails, moderation is skipped rather than
// blocking an upload over a missing key or a transient outage. A photo
// Rekognition can't read at all is turned away instead, since it would
// otherwise be stored without ever being checked.

import {
  RekognitionClient,
  DetectModerationLabelsCommand,
  ImageTooLargeException,
  InvalidImageFormatException,
} from "@aws-sdk/client-rekognition";

// Top-level categories to block, and how each is described to the user.
// The names must match Rekognition's moderation taxonomy exactly — a name
// that doesn't match blocks nothing, silently. These are from model 7.0,
// which renamed several older ones (e.g. "Drugs" and "Tobacco" became
// "Drugs & Tobacco"): https://docs.aws.amazon.com/rekognition/latest/dg/moderation-api.html
// Blocking a top-level category covers everything under it, e.g. "Violence"
// includes "Weapons" and "Explicit" includes "Explicit Nudity".
const BLOCKED_CATEGORIES = new Map([
  ["Explicit", "explicit content"],
  ["Violence", "violence or weapons"],
  ["Drugs & Tobacco", "drugs or tobacco"],
  ["Alcohol", "alcohol"],
  ["Gambling", "gambling"],
  ["Hate Symbols", "hate symbols"],
]);

// A newer model may rename categories again, so a response from any other
// version is logged as a prompt to recheck the names above.
const EXPECTED_MODEL_VERSION = "7.0";

// Below this score (0-100), a match is too uncertain to act on — kept fairly
// high to avoid false positives on ordinary product photos.
const MIN_CONFIDENCE = 75;

// What each kind of photo may show, and what the user is told when one is
// refused. Profile pictures follow the listing rules except for alcohol: a
// photo of someone holding a drink is an ordinary profile picture, even
// though alcohol can't be sold here.
const RULES = {
  listing: {
    allowed: new Set<string>(),
    flagged: (what: string) => `One of your photos was flagged for ${what} and can't be uploaded.`,
    uncheckable: "One of your photos couldn't be checked. Please upload it as a JPEG or PNG under 5 MB.",
  },
  avatar: {
    allowed: new Set(["Alcohol"]),
    flagged: (what: string) => `This photo was flagged for ${what} and can't be used as your profile picture.`,
    uncheckable: "This photo couldn't be checked. Please use a JPEG or PNG.",
  },
};

export type PhotoUse = keyof typeof RULES;

// Rekognition only reads JPEG and PNG, but the storage buckets also accept
// WebP (and GIF, for listings). The upload forms convert other formats to
// JPEG first, so this only catches a photo whose conversion failed, or an
// upload that didn't come through the forms.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isJpegOrPng(bytes: Buffer): boolean {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isJpeg || bytes.subarray(0, 8).equals(PNG_SIGNATURE);
}

export type ImageSafetyResult = { blocked: false } | { blocked: true; reason: string };

function getClient(): RekognitionClient | null {
  const accessKeyId = process.env.AWS_REKOGNITION_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REKOGNITION_REGION;
  if (!accessKeyId || !secretAccessKey || !region) {
    return null;
  }
  return new RekognitionClient({ region, credentials: { accessKeyId, secretAccessKey } });
}

export async function checkImageSafety(
  imageBytes: Buffer,
  use: PhotoUse
): Promise<ImageSafetyResult> {
  const rules = RULES[use];
  const client = getClient();
  if (!client) {
    return { blocked: false };
  }
  if (!isJpegOrPng(imageBytes)) {
    return { blocked: true, reason: rules.uncheckable };
  }

  let labels;
  try {
    const result = await client.send(
      new DetectModerationLabelsCommand({
        Image: { Bytes: imageBytes },
        MinConfidence: MIN_CONFIDENCE,
      })
    );
    labels = result.ModerationLabels ?? [];
    if (result.ModerationModelVersion !== EXPECTED_MODEL_VERSION) {
      console.warn(
        `Rekognition moderation model is ${result.ModerationModelVersion}, expected ${EXPECTED_MODEL_VERSION} — check BLOCKED_CATEGORIES still matches its label names.`
      );
    }
  } catch (err) {
    // These mean this particular photo can't be read, not that the service
    // is down, so it's turned away rather than stored unchecked.
    if (err instanceof InvalidImageFormatException || err instanceof ImageTooLargeException) {
      return { blocked: true, reason: rules.uncheckable };
    }
    console.error("Rekognition request failed:", err);
    return { blocked: false };
  }

  // A match comes back once per level of the taxonomy, e.g. "Smoking", its
  // parent "Drugs & Tobacco Paraphernalia & Use", and the top-level "Drugs &
  // Tobacco" itself (whose ParentName is ""). So the top-level category shows
  // up as some label's own name — its parent's name is checked too, in case
  // a response ever leaves the top-level entry out.
  for (const label of labels) {
    for (const name of [label.Name, label.ParentName]) {
      const description = name && !rules.allowed.has(name) && BLOCKED_CATEGORIES.get(name);
      if (description) {
        return { blocked: true, reason: rules.flagged(description) };
      }
    }
  }

  return { blocked: false };
}
