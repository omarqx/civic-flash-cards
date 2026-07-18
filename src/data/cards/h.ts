import type { Flashcard } from '../../types';

// ===== H: Holidays (125–128) =====
export const CARDS_H: Flashcard[] = [
  { id: 125, q: "What is Independence Day?", cat: "H",
    answers: ["A holiday to celebrate U.S. independence (from Britain)", "The country's birthday"], requires: 1,
    why: "Independence Day, celebrated July 4, marks the 1776 adoption of the Declaration of Independence and is often called the country's birthday.",
    hint: "July 4th = the nation's birthday.",
    related: [9, 79] },
  { id: 126, q: "Name three national U.S. holidays.", cat: "H",
    answers: ["New Year's Day", "Martin Luther King, Jr. Day", "Presidents Day (Washington's Birthday)", "Memorial Day", "Independence Day", "Labor Day", "Columbus Day", "Veterans Day", "Thanksgiving Day", "Christmas Day"], requires: 3,
    why: "The federal government designates national holidays such as Independence Day, Thanksgiving, and Memorial Day to mark shared historical events and observances throughout the year.",
    hint: "Ten national holidays span the whole calendar year.",
    related: [125, 127, 128] },
  { id: 127, q: "What is Memorial Day?", cat: "H",
    answers: ["A holiday to honor soldiers who died in military service"], requires: 1,
    why: "Memorial Day, observed on the last Monday in May, honors U.S. military service members who died while serving their country.",
    hint: "Memorial Day = remembering those who died in service.",
    related: [128] },
  { id: 128, q: "What is Veterans Day?", cat: "H",
    answers: ["A holiday to honor people in the (U.S.) military", "A holiday to honor people who have served (in the U.S. military)"], requires: 1,
    why: "Veterans Day, observed November 11, honors all people who have served in the U.S. military, living or deceased.",
    hint: "Veterans Day = honoring all who served.",
    related: [127] },
];
