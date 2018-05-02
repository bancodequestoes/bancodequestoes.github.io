var keepLoading = true;

var $questions;

function getQueryVariable(variable){

   var query = window.location.search.substring(1);
   var vars = query.split("&");

   for (var i = 0;i < vars.length; i++) {
       var pair = vars[i].split("=");
       if(pair[0] == variable){
           return pair[1];
       }
   }

   return(false);
}

function getLevel(level){

    if(level == "facil"){
        return "(Fácil)";
    }else if(level == "medio"){
        return "(Médio)";
    }else if(level == 'dificil'){
        return "(Difícil)";
    }

    return "(Desconhecido)";
}

function pad(a, b){
    return(1e15 + a + "").slice(-b);
}

function loadQuestions(cls, number){

    keepLoading = true;

    var pNumber = pad(number, 5);

    var url = "questoes/" + cls +"/" + pNumber+ ".html";

    $.ajax({
        type: 'GET',
        url: url,
        error : function(e) {
            keepLoading = false;
            $("#question-search").keyup();
            MathJax.Hub.Typeset();
        },
        success : function(data) {

            var $data = $(data);
            var $description = $data.find("description");
            var $answer = $data.find("answer");

            $answer.prepend("<p class='answer-label text-success font-weight-bold'>Resposta</p>");

            var tags = ($data.attr("data-tags") || "").split(" ");
            var level = $data.attr("data-level");

            $data.append([
                $('<div/>',{class:"tags"}).append([
                    $("<p/>",{class: "answer-label text-success font-weight-bold", text:"Tags"}),
                    tags.map(tag => {
                        return tag
                    })
                ])
            ])
            //console.log($data);

            $data.append([
                $('<div/>', {"class": "bottombar"}).append([
                    $('<a/>',{
                        "class": "open-answer",
                        text:"Ver Resposta",
                        href:"#"
                    }),
                    "&nbsp; | &nbsp;",
                    $('<a/>',{
                        "class": "open-tags",
                        text:"Tags",
                        href:"#"
                    }),
                    "&nbsp; | &nbsp;",
                    $('<a/>',{
                        "class": "share",
                        text:"Compartilhar",
                        href:"/?id=" + number
                    }),
                ])
            ]);

            $questions.append([
                $('<div/>',{ "class": "row question" }).append([
                    $('<div/>',{ "class": "col-md" }).append([
                        $("<span/>",{
                            text: "Questão " + number + " " + getLevel(level),
                            "class": "font-weight-bold"
                        }),
                        $data,
                        $('<hr/>')
                    ]),
                ]),
            ]);

            if(keepLoading){
                loadQuestions(cls, number + 1);
            }
       },
   });
}

function search(searchFor){

    if(searchFor){

        $(".question").hide();

        var $questions = $(".question").filter(function(){

            var texts = latinize($(this).text().toLowerCase());
            var tags = $(this).find("question").data("tags") || "";

            return texts.search(searchFor) !== -1 || tags.search(searchFor) !== -1;
        })

        $questions.each(function(index, el){
            $(this).show();
        });
    }else{
        $(".question").show();
    }
}

$(function(){

    MathJax.Hub.Config({
		tex2jax: {
			inlineMath: [ ['$','$'], ["\\(","\\)"] ],
			processEscapes: true
		}
	});

    $.ajaxSetup({ cache: false });

    $questions = $(".questions");

    $("#form-question-search").submit(function(){

        var $input = $(this).find(".question-search");

        var searchFor = latinize($input.val().trim().toLowerCase());

        search(searchFor);

        // Hide the keyboard when the user submit the form
        $input.blur();

        //Avoid submit the form
        return false;
    });

    $(document).on("click",".open-tags",function() {

        $tags = $(this).parent().prev();

        $(".tags").hide("slide");

        if( ! $tags.is(":visible")){
            $tags.show("slide");
        }

        return false;
    });

    $(document).on("click",".open-answer",function() {

        $answer = $(this).parent().prev().prev();

        $("answer").hide("slide");
        $(".open-answer").text("Ver Resposta");

        if( ! $answer.is(":visible")){
            $answer.show("slide");
            $(this).text("Ocultar Resposta");
        }

        $answer.find("pre code").each(function(i, block) {
            hljs.highlightBlock(block);
        });

        return false;
    });

    $(".menu-item").click(function(){

        var link = $(this).data("link");
        var name = $(this).data("name");

        $(".dropdown .nav-link").text(name);

        $(".navbar-collapse").collapse('hide');

        $("#question-search").val("");
        $questions.html("");
        loadQuestions(link, 1);
    });

    loadQuestions("computacao-1", 1);

    var id = getQueryVariable("id");

    if(id){

        id = parseInt(id);

        $(".question-search").val("Questão "+id);

        search("Questão "+id);
    }
});
