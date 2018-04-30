var keepLoading = true;

var $questions;

function pad(a, b){
    return(1e15 + a + "").slice(-b);
}

function loadQuestions(level, number){

    keepLoading = true;

    var pNumber = pad(number, 5);

    $.ajax({
        type: 'GET',
        url: "questoes/" + level +"/"+ pNumber+ ".html",
        error : function(e) {
            keepLoading = false;
        },
        success : function(data) {
            var str = "";

            str += "<div class='row question'>";
            str += "<div class='col-md'>";
            str += "<strong>Questão " + number + ".</strong>";
            str += data;
            str += "<a class='open-answer' href='#'>Ver Resposta</a>";
            str += "<hr/>";
            str += "</div>";

            str += "</div>";


            $questions.append(str);

            if(keepLoading){
                loadQuestions(level, number + 1);
            }
       },
   });
}

$(function(){

    hljs.initHighlightingOnLoad();

    $questions = $(".questions");

    $('#question-level').change(function () {
        var level = $(this).find("option:selected").val();
        $questions.children().remove();
        loadQuestions(level, 1);
    });

    $("#question-search").keyup(function(){

        var searchFor = $(this).val().trim().toLowerCase();

        if(searchFor){
            $(".question").hide().filter(function(){

                var texts = $(this).text().toLowerCase();
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

        $answer = $(this).prev();

        if($answer.find(".answer-label").length == 0){
            $answer.prepend("<p class='answer-label text-success font-weight-bold'>Resposta</p>");
        }

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

    loadQuestions("facil", 1);
});
