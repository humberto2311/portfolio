import { Component } from '@angular/core';

interface CarouselItems {
  image: string;
  title: string;
  topic: string;
  description: string;


}
@Component({
  selector: 'app-carrusel',
  standalone: true,
  imports: [],
  templateUrl: './carrusel.component.html',
  styleUrl: './carrusel.component.scss'
})

export class CarruselComponent {

    currentIndex = 0;

  items: CarouselItems[] = [
    {
      image: '/assets/images/SanFelipe.jpg',
      title: 'Humberto',
      topic: 'Systems Engineer | Backend Developer',
      description: 'Welcome to my portfolio! I am a proactive systems engineer with experience in developing software solutions that solve real-world problems. I work with technologies like Java, Spring Boot, Angular, and I have knowledge in relational and non-relational databases like MySQL and MongoDB. I\'m constantly looking to learn and improve my skills.',
    },
    {
      image: '/assets/images/AnotherImage.jpg',
      title: 'Another Title',
      topic: 'Another Topic',
      description: 'Description for another item.',
    },
   
  ];

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
  }

}

