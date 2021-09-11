import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DataService } from 'src/app/services/data.service';
import { MeasurementsCompleteComponent } from '../dialogs/measurements-complete/measurements-complete.component';

@Component({
  selector: 'app-drainage',
  templateUrl: './drainage.component.html',
  styleUrls: ['./drainage.component.css']
})
export class DrainageComponent implements OnInit {

  activeMeasurements: any[] = [];
  errorMsg: string;
  dialogConfig: MatDialogConfig;
  frequency: number;

  constructor(private dataService: DataService, private router: Router, public dialog: MatDialog) {
    this.dialogConfig = new MatDialogConfig();
    this.dialogConfig.autoFocus = true;
    this.dataService.getDisabledMeasurements()
      .then((res) => {
        sessionStorage.setItem('disabledMeasurements', JSON.stringify(res));
        //Check if all measurements have been completed
        if (!this.activeMeasurements[0].active && !this.activeMeasurements[1].active && !this.activeMeasurements[2].active) {
          //Alert user with dialog if measurements are complete
          this.dialogConfig.panelClass = 'measurements-complete-container';
          this.dialogConfig.disableClose = false;
          this.dialogConfig.data = {
            heading: "Measurements Complete",
            content: "You have successfully recorded your IPC drainage for today. <br>In a moment you will be taken back to My IPC",
          }
          let timer;
          let dialogRef = this.dialog.open(MeasurementsCompleteComponent, this.dialogConfig);
          dialogRef.afterOpened().subscribe(() =>
            timer = setTimeout(() => {
              this.dialog.closeAll();
            }, 10000))
          dialogRef.afterClosed()
            .subscribe(() => {
              clearTimeout(timer);
              this.router.navigate(['my-ipc']);
            });
        }
      })
      .catch((err) => console.log(err))
      .finally(() => this.dataService.loading.next(false));

    this.activeMeasurements = [
      { meas: "fluid", id: 4, active: true },
      { meas: "breath", id: 2, active: true },
      { meas: "pain", id: 3, active: true }
    ];

    this.dataService.disabledMeasurements.subscribe((data) => {
      data.forEach(number => {
        this.activeMeasurements.forEach(am => {
          if (am.id == number) {
            am.active = false;
          }
        })
      })
    });
  }

  ngOnInit(): void {
    //Call getFrequency for measurementId 4 (Fluid measurement - primary IPC drainage frequency)
    this.dataService.getFrequency(this.dataService.patient.value['urNumber'], 4)
      .then((freq: number) => this.frequency = freq)
      .catch((err) => console.log(err))
      .finally(() => this.dataService.loading.next(false));
  }

  routeBreath() {
    if (!this.activeMeasurements[0].active || this.frequency == 0) {
      this.router.navigate(['breath']);
    }
    else {
      this.errorMsg = "You must complete Fluid Drainage before entering how your Breathing feels"
    }
  }

  routePain() {
    if (!this.activeMeasurements[0].active || this.frequency == 0) {
      this.router.navigate(['pain']);
    } else {
      this.errorMsg = "You must complete Fluid Drainage before entering how your Pain feels"
    }
  }

}
