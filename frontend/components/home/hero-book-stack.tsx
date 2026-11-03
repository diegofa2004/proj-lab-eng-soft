import Image from "next/image";

import fahrenheitCover from "@/public/book-covers/fahrenheit-451.jpg";
import itCover from "@/public/book-covers/it.jpg";
import lulaCover from "@/public/book-covers/lula-volume-1.jpg";
import princeCover from "@/public/book-covers/o-pequeno-principe.jpg";
import testamentsCover from "@/public/book-covers/the-testaments.jpg";

import styles from "./hero-book-stack.module.css";

const books = [
  { src: itCover, className: styles.it },
  { src: testamentsCover, className: styles.testaments },
  { src: princeCover, className: styles.prince },
  { src: fahrenheitCover, className: styles.fahrenheit },
  { src: lulaCover, className: styles.lula },
];

export default function HeroBookStack() {
  return (
    <div
      aria-label="Featured book covers: It, The Testaments, O Pequeno Príncipe, Fahrenheit 451, and Lula, volume 1"
      className={styles.stage}
      role="img"
    >
      {books.map((book) => (
        <span className={`${styles.book} ${book.className}`} key={book.src.src}>
          <Image alt="" className={styles.cover} priority sizes="(max-width: 640px) 22vw, 20vw" src={book.src} />
        </span>
      ))}
    </div>
  );
}
