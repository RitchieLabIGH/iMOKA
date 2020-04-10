import { Component, OnInit , Input } from '@angular/core';

@Component({
  selector: 'app-file-kmer',
  templateUrl: './file-kmer.component.html',
  styleUrls: ['./file-kmer.component.css']
})
export class FileKmerComponent implements OnInit {
    group_stat : any[];
  @Input() info: any;
  constructor() { }

  ngOnInit() {
      console.log(this.info)
      this.group_stat=[];
      this.info.groups_names.forEach(grp => {this.group_stat.push({"name" : grp, "count" : 0})});
      this.info.groups.forEach(grpn => {this.group_stat[grpn].count += 1 ;})
      this.info.tot_graphs=0;
      this.info.graph_info = [];
      Object.keys(this.info.graphs).forEach(gr=>{
          this.info.tot_graphs+=this.info.graphs[gr][0];
          this.info.graph_info.push({"name" : gr, "count" :this.info.graphs[gr][0], "kmers" : this.info.graphs[gr][1] });
      })
      this.info.reduction_percentage = (this.info.final_kmers*100) /this.info.initial_kmers; 
  }

}
