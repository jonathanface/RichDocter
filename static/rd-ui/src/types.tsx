import { AttributeValue } from "@aws-sdk/client-dynamodb";
export type AttributeMap = { [key: string]: AttributeValue };

export interface AssociationDetails {
  aliases: string;
  case_sensitive: boolean;
  extended_description: string;
}

export interface Association {
  association_id: string;
  association_name: string;
  association_type: number;
  short_description: string;
  portrait: string;
  details: AssociationDetails;
}

export interface BlocksData {
  last_evaluated_key: AttributeMap;
  scanned_count: number;
  items: AttributeMap;
}

export interface Chapter {
  id: string;
  story_id: string;
  place: number;
  title: string;
  bup_arm: string;
}

export interface Story {
  story_id: string;
  created_at: number;
  title: string;
  description: string;
  series_id: string;
  chapters: Chapter[];
  place: number;
  image_url: string;
}

export interface DocumentBlockStyle {
  style: string;
  start: number;
  end: number;
}

export interface DocumentTab {
  start: number;
  end: number;
}