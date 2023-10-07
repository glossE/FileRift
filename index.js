var up = document.getElementById('GFG_UP'); 
        var down = document.getElementById('geeks'); 
        
        
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