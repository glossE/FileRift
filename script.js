
var up = document.getElementById('GFG_UP'); 
var down = document.getElementById('geeks'); 
var dnCheck =document.getElementById('switch');
      
    function gfg() { 
        var minm = 100000000; 
        var maxm = 999999999; 
        down.innerHTML = Math.floor(Math 
        .random() * (maxm - minm + 1)) + minm;
        document.getElementById('geeks').style.fontSize = "2rem" 
    } 
    function gif(){
        document.querySelector('.text-center img').style.display="flex";
    }

function colorSwitch(){
    if(dnCheck.checked){
        document.querySelector('body').classList.add('dayNightSwitch');
        document.querySelector('.main').classList.add('fontColor');
        
    }
    else{
        document.querySelector('body').classList.remove("dayNightSwitch");
        document.querySelector('.main').classList.remove('fontColor');
        
    }

}



   