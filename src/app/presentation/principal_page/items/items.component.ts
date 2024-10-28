import { Component } from '@angular/core';
interface CarouselItem {
  image: string;
  title: string;
  topic: string;
  description: string;
}


@Component({
  selector: 'app-items',
  standalone: true,
  imports: [],
  templateUrl: './items.component.html',
  styleUrl: './items.component.scss'
})
export class ItemsComponent {
  currentIndex = 0;

  items: CarouselItem[] = [
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
    // Agrega más items según sea necesario
  ];

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
  }
}
