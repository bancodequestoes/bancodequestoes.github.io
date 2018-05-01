var keepLoading = true;

var $questions;

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
                $('<div/>', {"class": "bottombar"}).append([
                    $('<a/>',{
                        "class": "open-answer",
                        text:"Ver Resposta",
                        href:"#"
                    }),
                    "&nbsp; Tags: ",
                    tags.map(tag => {
                        return tag
                    })
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

$(function(){

    MathJax.Hub.Config({
		tex2jax: {
			inlineMath: [ ['$','$'], ["\\(","\\)"] ],
			processEscapes: true
		}
	});

    $.ajaxSetup({ cache: false });

    $questions = $(".questions");

    $(".question-search").keyup(function(){

        var searchFor = latinize($(this).val().trim().toLowerCase());

        if(searchFor){
            $(".question").hide().filter(function(){

                var texts = latinize($(this).text().toLowerCase());
                var tags = $(this).find("question").data("tags") || "";

                return texts.search(searchFor) !== -1 || tags.search(searchFor) !== -1;
            }).each(function(index, el){
                $(this).show();
            });
        }else{
            $(".question").show();
        }
    });

    $(document).on("click",".open-answer",function() {

        $answer = $(this).parent().prev();

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

    $(document).on("touchstart",".tag",function() {
        $("#question-search").val($(this).text()).keyup();
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
});
